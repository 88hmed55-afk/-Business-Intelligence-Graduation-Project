"""Unit tests for the BI service forecasting engine and export service."""

from datetime import date

import pytest

from app.application.services.bi_service import BIService
from app.application.services.export_service import ExportService
from app.core.exceptions import BadRequestError
from app.shared.enums import ReportExportFormat


class _FakeDb:
    """Returns a fixed set of rows for every query."""

    def __init__(self, rows):
        self._rows = [
            type("Row", (), {"period": r[0], "val": r[1]})() if isinstance(r, tuple) else r
            for r in rows
        ]

    def execute(self, sql, params=None):
        class _Result:
            def __init__(self, rows):
                self.rows = rows

            def all(self):
                return self.rows

        return _Result(self._rows)

    def scalar(self, sql, params=None):
        return 0


def _monthly(month: int, value: float):
    return (f"2025-{month:02d}", value)


def test_forecast_linear_regression_slope_and_bounds():
    rows = [_monthly(m, float(m)) for m in range(1, 7)]  # perfect y = x
    service = BIService(_FakeDb(rows))

    result = service.forecast("revenue", periods=3)
    assert result.trend == "up"
    assert len(result.points) == 9  # 6 actual + 3 forecast
    assert all(p.lower_bound <= p.predicted <= p.upper_bound for p in result.points)
    future = result.points[-1]
    assert future.actual is None
    assert future.predicted > result.points[-2].predicted


def test_forecast_insufficient_data_returns_empty():
    service = BIService(_FakeDb([]))
    result = service.forecast("revenue", periods=3)
    assert result.trend == "insufficient_data"
    assert result.points == []
    assert result.growth_pct == 0.0


def test_forecast_down_trend():
    rows = [_monthly(m, float(7 - m)) for m in range(1, 7)]
    service = BIService(_FakeDb(rows))
    result = service.forecast("revenue", periods=2)
    assert result.trend == "down"


def test_trend_handles_empty_data():
    service = BIService(_FakeDb([]))
    result = service.trend("revenue", "monthly", date(2025, 1, 1), date(2025, 12, 31))
    assert result.points == []
    assert result.total == 0.0
    assert result.min_value == 0.0
    assert result.max_value == 0.0


def test_trend_computes_cumulative():
    service = BIService(_FakeDb([("2025-01", 100), ("2025-02", 50)]))
    result = service.trend("revenue", "monthly", date(2025, 1, 1), date(2025, 3, 1))
    assert result.total == 150.0
    assert result.average == 75.0
    assert result.points[0].cumulative == 100.0
    assert result.points[1].cumulative == 150.0
    assert result.min_value == 50.0
    assert result.max_value == 100.0


def test_rankings_maps_rows():
    rows = [
        type("R", (), {"pid": "a1", "name": "Widget", "value": 100.0, "secondary": 5})(),
        type("R", (), {"pid": "b2", "name": "Gadget", "value": 40.0, "secondary": 2})(),
    ]
    service = BIService(_FakeDb(rows))
    result = service.rankings("products", date(2025, 1, 1), date(2025, 12, 31), limit=5)
    assert [i.rank for i in result.items] == [1, 2]
    assert result.items[0].name == "Widget"
    assert result.items[0].value == 100.0


def test_aggregate_calculates_percentages():
    rows = [
        type("R", (), {"label": "Electronics", "value": 300.0, "cnt": 10})(),
        type("R", (), {"label": "Books", "value": 100.0, "cnt": 4})(),
    ]
    service = BIService(_FakeDb(rows))
    result = service.aggregate("category", date(2025, 1, 1), date(2025, 12, 31))
    assert result.total == 400.0
    assert result.buckets[0].percentage == 75.0
    assert result.buckets[1].percentage == 25.0


def test_export_csv():
    service = ExportService()
    content_type, content, filename = service.export(
        report_type="test",
        rows=[{"name": "A", "value": 1}, {"name": "B", "value": 2}],
        format=ReportExportFormat.CSV,
        title="Test",
    )
    assert content_type == "text/csv"
    text = content.decode("utf-8")
    assert "name,value" in text
    assert "A,1" in text
    assert filename.endswith(".csv")


def test_export_xlsx_and_pdf_produce_bytes():
    service = ExportService()
    rows = [{"name": "A", "value": 1}]
    for fmt in (ReportExportFormat.XLSX, ReportExportFormat.PDF):
        content_type, content, filename = service.export(
            report_type="test", rows=rows, format=fmt, title="Test"
        )
        assert isinstance(content, bytes)
        assert len(content) > 100
        assert filename.endswith(f".{fmt.value}")


def test_export_rejects_oversized_payload():
    service = ExportService()
    rows = [{"x": i} for i in range(20_000)]
    with pytest.raises(BadRequestError):
        service.export(
            report_type="test", rows=rows, format=ReportExportFormat.CSV, title="Too big"
        )
