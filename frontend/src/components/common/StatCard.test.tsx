import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { DollarSign } from "lucide-react";

import { StatCard } from "@/components/common/StatCard";

describe("StatCard", () => {
  it("renders title and compacted value", () => {
    render(<StatCard title="Total Revenue" value={1234567} />);
    expect(screen.getByText("Total Revenue")).toBeInTheDocument();
    expect(screen.getByText("1.2M")).toBeInTheDocument();
  });

  it("shows positive delta badge with percentage", () => {
    render(<StatCard title="Orders" value={100} delta={12} deltaPercent={12.5} />);
    expect(screen.getByText("+12.5%")).toBeInTheDocument();
    expect(screen.getByText("vs last period")).toBeInTheDocument();
  });

  it("shows negative delta badge without plus sign", () => {
    render(<StatCard title="Orders" value={100} delta={-3} deltaPercent={-2.4} />);
    expect(screen.getByText("-2.4%")).toBeInTheDocument();
  });

  it("omits delta when zero", () => {
    render(<StatCard title="Orders" value={100} delta={0} />);
    expect(screen.queryByText("vs last period")).not.toBeInTheDocument();
  });

  it("renders custom children instead of formatted value", () => {
    render(
      <StatCard title="Widgets" value={100}>
        <span>Custom body</span>
      </StatCard>,
    );
    expect(screen.getByText("Custom body")).toBeInTheDocument();
    expect(screen.queryByText("100")).not.toBeInTheDocument();
  });

  it("renders an icon when provided", () => {
    render(<StatCard title="Revenue" value={10} icon={<DollarSign aria-label="dollar icon" />} />);
    expect(screen.getByLabelText("dollar icon")).toBeInTheDocument();
  });
});
