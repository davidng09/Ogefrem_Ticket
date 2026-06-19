export function WorkspaceBackground() {
  return (
    <div className="workspace-bg" aria-hidden="true">
      <div className="workspace-bg__mesh" />
      <div className="workspace-bg__block workspace-bg__block--blue-1" />
      <div className="workspace-bg__block workspace-bg__block--blue-2" />
      <div className="workspace-bg__block workspace-bg__block--yellow-1" />
      <div className="workspace-bg__block workspace-bg__block--yellow-2" />
      <div className="workspace-bg__block workspace-bg__block--gray-1" />
      <div className="workspace-bg__glow workspace-bg__glow--blue" />
      <div className="workspace-bg__glow workspace-bg__glow--yellow" />
    </div>
  )
}
