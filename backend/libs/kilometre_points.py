"""Official kilometre points of Spanish roads, from the CartoCiudad (IGN) addresses WFS."""

import xml.etree.ElementTree as ET
from collections import defaultdict

import httpx

from models import KilometrePoint

WFS_URL: str = "https://www.cartociudad.es/wfs-inspire/direcciones"
KILOMETRE_POINT_TYPE: str = "https://inspire.ec.europa.eu/codelist/LocatorDesignatorTypeValue/kilometrePoint"
MARGIN_DEG: float = 0.01
"""~1 km, the spacing of the points, so the ends of a stretch keep a point on each side."""
TIMEOUT_S: int = 120
NS: dict[str, str] = {
    "ad": "http://inspire.ec.europa.eu/schemas/ad/4.0",
    "fes": "http://www.opengis.net/fes/2.0",
    "gml": "http://www.opengis.net/gml/3.2",
    "gn": "http://inspire.ec.europa.eu/schemas/gn/4.0",
    "wfs": "http://www.opengis.net/wfs/2.0",
    "xlink": "http://www.w3.org/1999/xlink",
}
XLINK_HREF: str = f"{{{NS['xlink']}}}href"
GML_ID: str = f"{{{NS['gml']}}}id"
FILTER_NAMESPACES: str = " ".join(f'xmlns:{prefix}="{uri}"' for prefix, uri in NS.items())


def _get_features(client: httpx.Client, typename: str, conditions: str) -> list[ET.Element]:
    """Posted, since a filter with the ids of every road around a large fire overflows a URL."""
    response = client.post(
        WFS_URL,
        data={
            "service": "WFS",
            "version": "2.0.0",
            "request": "GetFeature",
            "typenames": typename,
            "filter": f"<fes:Filter {FILTER_NAMESPACES}>{conditions}</fes:Filter>",
        },
        timeout=TIMEOUT_S,
    )
    response.raise_for_status()
    return list(ET.fromstring(response.content).iterfind("wfs:member/*", NS))


def _bbox_condition(bbox: tuple[float, float, float, float]) -> str:
    west, south, east, north = bbox
    return (
        "<fes:BBOX><fes:ValueReference>ad:position/ad:GeographicPosition/ad:geometry</fes:ValueReference>"
        '<gml:Envelope srsName="urn:ogc:def:crs:EPSG::4326">'
        f"<gml:lowerCorner>{south - MARGIN_DEG} {west - MARGIN_DEG}</gml:lowerCorner>"
        f"<gml:upperCorner>{north + MARGIN_DEG} {east + MARGIN_DEG}</gml:upperCorner>"
        "</gml:Envelope></fes:BBOX>"
    )


def fetch_kilometre_points(
    client: httpx.Client, bboxes: list[tuple[float, float, float, float]]
) -> dict[str, list[KilometrePoint]]:
    """Kilometre points around any of `bboxes` (lon/lat), by road name (`A-493`, `N-403`, ...).

    One bbox per road stretch instead of the whole fire: a large fire's bbox holds thousands of points, mostly of
    roads it does not cross, and CartoCiudad drops the connection before sending them.
    """
    if not bboxes:
        return {}
    areas = "".join(_bbox_condition(bbox) for bbox in bboxes)
    addresses = _get_features(
        client,
        "ad:Address",
        "<fes:And>"
        f"{f'<fes:Or>{areas}</fes:Or>' if len(bboxes) > 1 else areas}"
        "<fes:PropertyIsEqualTo>"
        "<fes:ValueReference>ad:locator/ad:AddressLocator/ad:designator/ad:LocatorDesignator/ad:type/@xlink:href</fes:ValueReference>"
        f"<fes:Literal>{KILOMETRE_POINT_TYPE}</fes:Literal>"
        "</fes:PropertyIsEqualTo>"
        "</fes:And>",
    )
    points_by_road_id: dict[str, list[KilometrePoint]] = defaultdict(list)
    for address in addresses:
        lat, lon = (float(value) for value in address.findtext(".//gml:pos", namespaces=NS).split())
        locator = address.find("ad:locator/ad:AddressLocator", NS)
        km = float(locator.findtext("ad:designator/ad:LocatorDesignator/ad:designator", namespaces=NS))
        road_id = locator.find("ad:withinScopeOf", NS).get(XLINK_HREF).rsplit("#", 1)[1]
        points_by_road_id[road_id].append(KilometrePoint(km=km, lonlat=(lon, lat)))
    if not points_by_road_id:
        return {}

    roads = _get_features(
        client, "ad:ThoroughfareName", "".join(f'<fes:ResourceId rid="{road_id}"/>' for road_id in points_by_road_id)
    )
    points_by_name: dict[str, list[KilometrePoint]] = defaultdict(list)
    for road in roads:
        points_by_name[road.findtext(".//gn:text", namespaces=NS)].extend(points_by_road_id[road.get(GML_ID)])
    return points_by_name
