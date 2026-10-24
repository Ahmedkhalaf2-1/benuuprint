"use client";

import { Component, type ReactNode } from "react";

/** Catches render/load errors from the 3D layer so the 2D visual stays. `onError` lets the owner remember the failure. */
export class RenderBoundary extends Component<{ children: ReactNode; fallback?: ReactNode; onError?: (e: unknown) => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(e: unknown) { this.props.onError?.(e); }
  render() { return this.state.failed ? (this.props.fallback ?? null) : this.props.children; }
}
