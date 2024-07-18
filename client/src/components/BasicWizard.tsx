import { useEffect, useState } from 'react';
import Api, { ApiConfigResponse, ApiResponse } from '../utils/Api';
import ModeSelector, { SelectedMode } from './ModeSelector';
import { ExfilExtension, StorageExtension } from './extensions/Extension';
import {
  getStorages,
  initializeExfilExtensions,
} from './extensions/ExtensionManager';
import {
  Typography,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Box,
  Button,
  StepButton,
} from '@mui/material';
import Authentication from './Authentication';
import BasicSelector from './BasicSelector';
import { snackError } from '../utils/Snack';

interface WizardProps {
  api: Api;
  onFinished: (
    config: ApiConfigResponse,
    mode: SelectedMode,
    exfil: ExfilExtension,
    storage?: StorageExtension
  ) => void;
}

enum Steps {
  Authentication,
  SelectAction,
  SelectExfil,
  ConfigureExfil,
  SelectStorage,
  ConfigureStorage,
  Confirm,
}

export default function BasicWizard({ api, onFinished }: WizardProps) {
  const [storages, _] = useState(getStorages());
  const [authenticated, setAuthenticated] = useState<boolean>(false);
  const [config, setConfig] = useState<ApiConfigResponse | undefined>(
    undefined
  );
  const [mode, setMode] = useState<SelectedMode>('None');
  const [exfils, setExfils] = useState<ExfilExtension[]>([]);
  const [selectedExfil, setSelectedExfil] = useState<ExfilExtension | null>(
    null
  );
  const [exfilConfigured, setExfilConfigured] = useState(false);
  const [selectedStorage, setSelectedStorage] =
    useState<StorageExtension | null>(null);
  const [storageConfigured, setStorageConfigured] = useState(false);
  const [step, setStep] = useState(Steps.Authentication);
  const isUploadMode = mode == 'UploadChunked' || mode == 'UploadSingle';


  useEffect(() => {
    async function getConfig() {
      try {
        const res = await api.config();
        setConfig(res);
      } catch (error) {
        const err = error as ApiResponse;
        snackError(`Failed querying config: ${err.message}`);
        setAuthenticated(false);
      }
    }
    if (authenticated) getConfig();
  }, [authenticated]);

  useEffect(() => {
    if (!config) return;
    setExfils(
      initializeExfilExtensions(api, config).filter((e) => e.isPresent())
    );
  }, [config]);

  function onAuthenticated(): void {
    setAuthenticated(true);
    setStep(Steps.SelectAction);
  }

  function onModeSelected(type: SelectedMode, exfils: ExfilExtension[]): void {
    setMode(type);
    setExfils(exfils);
    setStep(Steps.SelectExfil);
  }

  function onExfilSelected(idx: number): void {
    const exfil = exfils[idx];
    setSelectedExfil(exfil);

    var nextStep = Steps.ConfigureExfil;

    if (!exfil.isConfigurable) {
      nextStep = Steps.SelectStorage; // Skip configuration step
      if (!isUploadMode) nextStep = Steps.ConfigureStorage + 1; // Skip storage selection + configuration step for downloads
    }

    setStep(nextStep);
  }

  function onStorageSelected(idx: number): void {
    const storage = storages[idx];
    setSelectedStorage(storage);
    if (!storage.isConfigurable)
      setStep(Steps.ConfigureStorage + 1); // Skip configuration step
    else
      setStep(Steps.ConfigureStorage);
  }

  function modeToString(mode: SelectedMode): string {
    // "You'd like to ..."
    switch (mode) {
      case 'None':
        return 'do nothing';
      case 'DownloadSingle':
        return 'perform a basic download';
      case 'UploadSingle':
        return 'perform a basic upload';
      case 'DownloadChunked':
        return 'perform a chunked download';
      case 'UploadChunked':
        return 'perform a chunked upload';
    }
  }

  function onStartOver(): void {
    setSelectedStorage(null);
    setSelectedExfil(null);
    setExfils(
      initializeExfilExtensions(api, config as ApiConfigResponse).filter((e) =>
        e.isPresent()
      )
    );
    setMode('None');
    setStep(0);
    setExfilConfigured(false);
    setStorageConfigured(false);
  }

  function onFinish() {
    onFinished(
      config as ApiConfigResponse,
      mode,
      selectedExfil as ExfilExtension,
      selectedStorage ? selectedStorage : undefined
    );
  }

  const getExfilConfigLabel = () => {
    if (!selectedExfil) return <i>No transport selected yet.</i>;
    if (exfilConfigured) return <i>{selectedExfil.displayName} configured.</i>;
    if (!selectedExfil.isConfigurable)
      return <i>{selectedExfil?.displayName} is not configurable.</i>;

    return <>Configure {selectedExfil.displayName}:</>;
  };

  const getStorageConfigLabel = () => {
    if (!selectedStorage) return <i>No storage selected.</i>;
    if (storageConfigured)
      return <i>{selectedStorage.displayName} configured.</i>;
    if (!selectedStorage.isConfigurable)
      return <i>{selectedStorage?.displayName} is not configurable.</i>;

    return <>Configure {selectedStorage.displayName}:</>;
  };

  function onExfilConfigFinished(): void {
    setExfilConfigured(true);
    setStep(Steps.ConfigureExfil + 1);
  }

  function onStorageConfigFinished(): void {
    setStorageConfigured(true);
    setStep(Steps.ConfigureStorage + 1);
  }

  function onConfigChange(config: ApiConfigResponse): void {
    setConfig(config);
  }

  function navToModeSelect(): void {
    setStep(Steps.SelectAction);
    setMode('None');
    setSelectedExfil(null);
    setSelectedStorage(null);
  }
  function navToExfilSelect(): void {
    setStep(Steps.SelectExfil);
    setSelectedExfil(null);
    setSelectedStorage(null);
  }
  function navToExfilConfig(): void {
    setStep(Steps.ConfigureExfil);
    setSelectedStorage(null);
  }
  function navToStorageSelect(): void {
    setStep(Steps.SelectStorage);
  }
  function navToStorageConfig(): void {
    setStep(Steps.ConfigureStorage);
  }

  return (
    <>
      <Typography gutterBottom>
        Welcome to Volatile Vault. This screen gives you fine-grained control
        over the way your data is being uploaded, downloaded and stored. Use the
        following wizard to configure your up- & downloads!
      </Typography>
      <Stepper activeStep={step} orientation="vertical">
        {/* 0 - Authentication */}
        <Step key={Steps.Authentication}>
          <StepLabel>
            <Typography variant="subtitle1">
              {authenticated ? <i>Authenticated!</i> : <>Authentication</>}
            </Typography>
          </StepLabel>
          <StepContent>
            <Authentication api={api} onAuthenticated={onAuthenticated} />
          </StepContent>
        </Step>
        {/* 1 - Select action */}
        <Step key={Steps.SelectAction}>
          <StepButton onClick={navToModeSelect}>
            <Typography variant="subtitle1">
              {mode == 'None' ? (
                'What would you like to do?'
              ) : (
                <i>You will {modeToString(mode)}.</i>
              )}
            </Typography>
          </StepButton>
          <StepContent>
            <ModeSelector exfils={exfils} onSelected={onModeSelected} />
          </StepContent>
        </Step>
        {/* 2 - Select exfil */}
        <Step key={Steps.SelectExfil}>
          <StepButton
            disabled={step <= Steps.SelectExfil}
            onClick={navToExfilSelect}
          >
            <Typography variant="subtitle1">
              {selectedExfil == null ? (
                'Which transport should be used for exfiltration?'
              ) : (
                <i>
                  You will use {selectedExfil.displayName} for exfiltration.
                </i>
              )}
            </Typography>
          </StepButton>
          <StepContent>
            <BasicSelector
              items={exfils}
              type="Exfil"
              onSelected={onExfilSelected}
            />
          </StepContent>
        </Step>
        {/* 3 - Configure exfil */}
        <Step key={Steps.ConfigureExfil}>
          <StepButton
            disabled={
              step <= Steps.ConfigureExfil || !selectedExfil?.isConfigurable
            }
            onClick={navToExfilConfig}
          >
            <Typography variant="subtitle1">{getExfilConfigLabel()}</Typography>
          </StepButton>
          <StepContent>
            {selectedExfil?.isConfigurable && (
              <>
                {selectedExfil.configView({
                  config: config as ApiConfigResponse,
                  onChange: onConfigChange,
                })}
                <Box sx={{ mb: 2 }}>
                  <div>
                    <Button
                      onClick={onExfilConfigFinished}
                      variant="contained"
                      sx={{ mt: 1, mr: 1 }}
                    >
                      Continue
                    </Button>
                  </div>
                </Box>
              </>
            )}
          </StepContent>
        </Step>
        {/* 4 - Select storage */}
        <Step key={Steps.SelectStorage}>
          <StepButton disabled={step <= Steps.SelectStorage || !isUploadMode} onClick={navToStorageSelect}>
            <Typography variant="subtitle1">
              {selectedStorage == null ? (
                isUploadMode ? (
                  'Which option should be used for storage?'
                ) : (
                  <i>
                    Downloads will determine the storage used automatically.
                  </i>
                )
              ) : (
                <i>You will use {selectedStorage.displayName} for storage.</i>
              )}
            </Typography>
          </StepButton>
          <StepContent>
            <BasicSelector
              items={storages}
              type="Storage"
              onSelected={onStorageSelected}
            />
          </StepContent>
        </Step>
        {/* 5 - Configure storage */}
        <Step key={Steps.ConfigureStorage}>
          <StepButton
            disabled={
              step <= Steps.ConfigureStorage || !selectedStorage?.isConfigurable
            }
            onClick={navToStorageConfig}
          >
            <Typography variant="subtitle1">
              {getStorageConfigLabel()}
            </Typography>
          </StepButton>
          <StepContent>
            {selectedStorage?.isConfigurable && (
              <>
                {selectedStorage.configView({
                  config: config as ApiConfigResponse,
                  onChange: onConfigChange,
                })}
                <Box sx={{ mb: 2 }}>
                  <div>
                    <Button
                      onClick={onStorageConfigFinished}
                      variant="contained"
                      sx={{ mt: 1, mr: 1 }}
                    >
                      Continue
                    </Button>
                  </div>
                </Box>
              </>
            )}
          </StepContent>
        </Step>
        {/* 6 - Confirm */}
        {step == Steps.Confirm && (
          <Step key={Steps.Confirm}>
            <StepLabel>
              <Typography variant="subtitle1">Let's go!</Typography>
            </StepLabel>
            <StepContent>
              <Typography variant="body2">
                Does everything look right to you? Then let's continue.
              </Typography>
              <Box sx={{ mb: 2 }}>
                <div>
                  <Button
                    onClick={onFinish}
                    variant="contained"
                    sx={{ mt: 1, mr: 1 }}
                  >
                    Continue
                  </Button>
                  <Button onClick={onStartOver} sx={{ mt: 1, mr: 1 }}>
                    Start over
                  </Button>
                </div>
              </Box>
            </StepContent>
          </Step>
        )}
      </Stepper>
    </>
  );
}
