type PendingAction = {
  actionId: string;
  cliId: string;
  sessionId?: string;
  payload: unknown;
};

type Props = {
  actions: Array<PendingAction>;
};

export function PendingActionsSection({ actions }: Props): JSX.Element {
  return (
    <section aria-label="Pending Actions">
      <h2>Pending Actions</h2>
      <ul data-testid="pending-actions">
        {actions.map((action) => (
          <li key={action.actionId}>
            {action.actionId} for {action.cliId} {action.sessionId ?? ""}
          </li>
        ))}
      </ul>
    </section>
  );
}
