import { Power } from 'lucide-react';
import { useState } from 'react';
import { currentUserId, personName } from '../../data';
import {
  RESUME_ROLES_NEEDED,
  addRoleApproval,
  canResume,
  isStubMfaCode,
} from '../../domain/approval';
import { sessionNow, updateSession, useSession } from '../../session/store';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { SelectField, TextField } from '../../ui/Field';
import { fmtDateTime } from '../../ui/format';
import { StubLabel } from '../../ui/Labels';
import { Modal } from '../../ui/Modal';
import { Page } from '../../ui/Page';
import { StatusChip } from '../../ui/StatusChip';

const ROLES = ['Compliance Lead', 'CEO', 'Security Officer', 'Head of Operations'];

const ACTIVE_TEXT = 'Active – AI requests receive 503';
const NORMAL_TEXT = 'Normal – AI requests are served';

function ActivateModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    setCode('');
    setError(null);
    onClose();
  };

  const submit = () => {
    if (!isStubMfaCode(code)) {
      setError('Enter a 6-digit code.');
      return;
    }
    updateSession((s) => ({
      ...s,
      killSwitch: {
        active: true,
        resumeApprovals: [],
        timeline: [
          ...s.killSwitch.timeline,
          {
            at: sessionNow(),
            actor: personName(currentUserId),
            text: 'Kill switch activated after the MFA step. AI requests now receive 503.',
          },
        ],
      },
    }));
    close();
  };

  return (
    <Modal
      open={open}
      title="Activate kill switch"
      onClose={close}
      footer={
        <>
          <Button onClick={close}>Cancel</Button>
          <Button variant="danger" type="submit" form="mfa-form">
            Activate
          </Button>
        </>
      }
    >
      <form
        id="mfa-form"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="flex flex-col gap-3"
      >
        <p className="text-sm text-slate-700">
          While active, the gateway answers every AI request with 503. Confirm with your MFA code.
        </p>
        <p className="flex items-center gap-2 text-xs text-slate-600">
          <StubLabel what="MFA" /> Any 6-digit code is accepted in this prototype.
        </p>
        <TextField
          label="MFA code"
          inputMode="numeric"
          autoComplete="off"
          maxLength={6}
          value={code}
          onChange={(e) => {
            setCode(e.target.value);
            setError(null);
          }}
          error={error}
        />
      </form>
    </Modal>
  );
}

function ResumePanel({ approvals }: { approvals: { role: string; by: string; at: string }[] }) {
  const [role, setRole] = useState(ROLES[0] ?? '');
  const [error, setError] = useState<string | null>(null);

  const approve = () => {
    const result = addRoleApproval(approvals, {
      role,
      by: personName(currentUserId),
      at: sessionNow(),
    });
    if (!result.ok) {
      setError(result.error);
      // A refused approval is an operation too, so it lands on the timeline.
      updateSession((s) => ({
        ...s,
        killSwitch: {
          ...s.killSwitch,
          timeline: [
            ...s.killSwitch.timeline,
            {
              at: sessionNow(),
              actor: role,
              text: `Resume approval refused: ${role} has already approved.`,
            },
          ],
        },
      }));
      return;
    }
    setError(null);
    const resumed = canResume(result.approvals);
    updateSession((s) => ({
      ...s,
      killSwitch: {
        active: !resumed,
        resumeApprovals: resumed ? [] : result.approvals,
        timeline: [
          ...s.killSwitch.timeline,
          {
            at: sessionNow(),
            actor: role,
            text: `Resume approved by ${role}.`,
          },
          ...(resumed
            ? [
                {
                  at: sessionNow(),
                  actor: 'System',
                  text: `Kill switch resumed after approvals from ${RESUME_ROLES_NEEDED} distinct roles. AI requests are served again.`,
                },
              ]
            : []),
        ],
      },
    }));
  };

  return (
    <Card title="Resume">
      <p className="mb-3 text-sm text-slate-700">
        Resuming needs approvals from {RESUME_ROLES_NEEDED} distinct roles. The same role cannot
        approve twice.
      </p>
      <p className="mb-3 flex items-center gap-2 text-xs text-slate-600">
        <StubLabel what="Sign-in" /> There is no sign-in in this prototype: you pick the role, and
        every approval is recorded as {personName(currentUserId)}. A real deployment needs two
        different people.
      </p>
      <p className="mb-3 text-sm text-slate-900" data-testid="approval-count">
        Approvals: {approvals.length} of {RESUME_ROLES_NEEDED}
        {approvals.length > 0 && ` (${approvals.map((a) => a.role).join(', ')})`}
      </p>
      <div className="flex flex-wrap items-end gap-2">
        <div className="w-56">
          <SelectField
            label="Approving role"
            value={role}
            onChange={(e) => {
              setRole(e.target.value);
              setError(null);
            }}
            options={ROLES.map((r) => ({ value: r, label: r }))}
          />
        </div>
        <Button variant="primary" onClick={approve}>
          Approve resume
        </Button>
      </div>
      {error && (
        <p className="mt-2 text-sm font-medium text-red-700" role="alert">
          {error}
        </p>
      )}
    </Card>
  );
}

export default function KillSwitchScreen() {
  const killSwitch = useSession((s) => s.killSwitch);
  const [modal, setModal] = useState(false);
  const timeline = [...killSwitch.timeline].reverse();

  return (
    <Page title="Kill switch" demo>
      <Card title="State">
        <div className="flex flex-wrap items-center gap-3">
          <StatusChip variant={killSwitch.active ? 'danger' : 'success'}>
            {killSwitch.active ? 'Active' : 'Normal'}
          </StatusChip>
          <p className="text-base font-medium text-slate-900" data-testid="kill-state">
            {killSwitch.active ? ACTIVE_TEXT : NORMAL_TEXT}
          </p>
          {!killSwitch.active && (
            <Button variant="danger" onClick={() => setModal(true)}>
              <Power size={14} aria-hidden />
              Activate kill switch
            </Button>
          )}
        </div>
        <p className="mt-3 text-xs text-slate-600">
          Activating needs an MFA step. Resuming needs approvals from {RESUME_ROLES_NEEDED} distinct
          roles.
        </p>
      </Card>
      {killSwitch.active && <ResumePanel approvals={killSwitch.resumeApprovals} />}
      <Card title="Evidence timeline">
        {timeline.length === 0 ? (
          <p className="text-sm text-slate-600">
            No operations yet in this session. Each activation and approval is recorded here.
          </p>
        ) : (
          <ol className="divide-y divide-slate-100" aria-label="Kill switch timeline">
            {timeline.map((t, i) => (
              <li key={`${t.at}-${i}`} className="flex flex-wrap gap-x-3 py-2 text-sm">
                <time dateTime={t.at} className="w-44 shrink-0 text-xs text-slate-600 tabular-nums">
                  {fmtDateTime(t.at)}
                </time>
                <span className="font-medium text-slate-900">{t.actor}</span>
                <span className="text-slate-700">{t.text}</span>
              </li>
            ))}
          </ol>
        )}
      </Card>
      <ActivateModal open={modal} onClose={() => setModal(false)} />
    </Page>
  );
}
