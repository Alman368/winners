from datetime import date

DATE_LENGTH = len("YYYY-MM-DD")
END_DATE_OFFSET = len("YYYY-MM-DD-00_00_")


class MultiDayExportError(Exception):
    pass


def capture_date(filename: str) -> date:
    """Reads the sensing day from a Copernicus Browser export name: '<from>-00_00_<to>-23_59_<collection>_<layer>.jpg'."""
    start = date.fromisoformat(filename[:DATE_LENGTH])
    end = date.fromisoformat(filename[END_DATE_OFFSET : END_DATE_OFFSET + DATE_LENGTH])
    if start != end:
        raise MultiDayExportError(filename)
    return start
