import { useState } from 'react';
import { NOW } from '../../data';
import { INTEGRATION_KIND_LABEL } from '../../domain/integrations';
import { Button } from '../../ui/Button';
import { CopyField } from '../../ui/CopyField';
import { SelectField } from '../../ui/Field';
import { fmtDateTime } from '../../ui/format';
import { StubLabel } from '../../ui/Labels';
import { Modal } from '../../ui/Modal';
import { Stepper } from '../../ui/Stepper';
import { StatusChip } from '../../ui/StatusChip';
import { useToast } from '../../ui/useToast';
import { CapabilityTags } from './parts';
import { connectIntegration, useIntegrations } from './store';
import { unlocksLine } from './text';

const STEPS = ['Choose', 'Configure', 'Test connection', 'First heartbeat'];

/**
 * Connects a source in four steps. The test and the heartbeat are stubs with a fixed result: no
 * collector exists in this prototype. Finishing marks the source connected for this session only.
 * Mount it only while open. `onClose` must be stable.
 */
export function ConnectFlow({ initialId, onClose }: { initialId: string; onClose: () => void }) {
  const toast = useToast();
  const available = useIntegrations().filter((i) => i.status === 'not-connected');
  const [step, setStep] = useState(0);
  const [id, setId] = useState(initialId);
  const [tested, setTested] = useState(false);
  const [beat, setBeat] = useState(false);
  const source = available.find((i) => i.id === id) ?? available[0];
  if (!source) return null;

  const choose = (next: string) => {
    setId(next);
    setTested(false);
    setBeat(false);
  };

  const finish = () => {
    connectIntegration(source.id);
    toast(`${source.name} connected for this session`);
    onClose();
  };

  const last = step === STEPS.length - 1;
  const blocked = (step === 2 && !tested) || (last && !beat);

  return (
    <Modal
      open
      onClose={onClose}
      width="max-w-2xl"
      title={`Connect ${source.name}`}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          {step > 0 && <Button onClick={() => setStep(step - 1)}>Back</Button>}
          {last ? (
            <Button variant="primary" disabled={blocked} onClick={finish}>
              Finish and connect
            </Button>
          ) : (
            <Button variant="primary" disabled={blocked} onClick={() => setStep(step + 1)}>
              Next
            </Button>
          )}
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Stepper steps={STEPS} current={step} />
        {step === 0 && (
          <div className="flex flex-col gap-3">
            <SelectField
              label="Source to connect"
              value={source.id}
              onChange={(e) => choose(e.target.value)}
              options={available.map((i) => ({
                value: i.id,
                label: `${i.name} (${INTEGRATION_KIND_LABEL[i.kind]})`,
              }))}
            />
            <p className="text-sm text-slate-700">{source.description}</p>
            <CapabilityTags name={source.name} capabilities={source.capabilities} />
            <p className="text-xs text-slate-600">Connecting it {unlocksLine(source.id)}.</p>
          </div>
        )}
        {step === 1 && (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-slate-700">
              Add this configuration where the source runs. It holds a key id only, never a secret.
            </p>
            <CopyField label="Configuration snippet" value={source.snippet} />
          </div>
        )}
        {step === 2 && (
          <div className="flex flex-col gap-3">
            <p className="flex items-center gap-2 text-sm text-slate-700">
              Check that NAG can reach the source. <StubLabel what="The connection test" />
            </p>
            <div>
              <Button onClick={() => setTested(true)}>Run test</Button>
            </div>
            {tested && (
              <p aria-live="polite" className="flex items-center gap-2 text-sm text-slate-800">
                <StatusChip variant="success">Test passed</StatusChip>
                The source answered and the key id was accepted. This result is fixed demo data.
              </p>
            )}
          </div>
        )}
        {step === 3 && (
          <div className="flex flex-col gap-3">
            <p className="flex items-center gap-2 text-sm text-slate-700">
              Wait for the source to report in. <StubLabel what="The first heartbeat" />
            </p>
            <div>
              <Button onClick={() => setBeat(true)}>Check for heartbeat</Button>
            </div>
            {beat && (
              <p aria-live="polite" className="flex items-center gap-2 text-sm text-slate-800">
                <StatusChip variant="success">Heartbeat received</StatusChip>
                First heartbeat at {fmtDateTime(NOW)}. This result is fixed demo data.
              </p>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
