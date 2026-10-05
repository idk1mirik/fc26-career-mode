"use client";
// components/SafeBoundary.tsx — предохранитель для второстепенных блоков.
// Если виджет (новости, цели совета, лента матчей…) упадёт при рендере, он
// просто исчезнет, а остальной экран продолжит работать — вместо «Application
// error» на всю страницу.
import { Component, type ReactNode } from "react";

export class SafeBoundary extends Component<{ children: ReactNode; name?: string }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: unknown) { console.error(`[SafeBoundary] блок "${this.props.name ?? "?"}" упал:`, error); }
  render() { return this.state.failed ? null : this.props.children; }
}
export default SafeBoundary;
