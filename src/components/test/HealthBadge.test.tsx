import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { HealthBadge } from "./HealthBadge";

describe("HealthBadge", () => {
  it("renders default text for ok status", () => {
    render(<HealthBadge status="ok" />);
    expect(screen.getByText("Sin incidencias")).toBeInTheDocument();
    expect(screen.getByLabelText(/Estado: Sin incidencias/i)).toBeInTheDocument();
  });

  it("renders custom label and aria-label", () => {
    render(<HealthBadge status="warning" label="Fatiga acumulada" />);
    expect(screen.getByText("Fatiga acumulada")).toBeInTheDocument();
    expect(screen.getByLabelText(/Estado: Fatiga acumulada/i)).toBeInTheDocument();
  });
});
