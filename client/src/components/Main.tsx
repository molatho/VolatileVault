import { Lock } from '@mui/icons-material';
import {
  CssBaseline,
  Typography,
  Container,
  Card,
  CardContent,
  CardMedia,
  Stack,
  Stepper,
  StepLabel,
  Step,
  StepContent,
  Box,
  Button,
} from '@mui/material';
import React, { useEffect, useState } from 'react';
import Api, { ApiConfigResponse, ApiResponse } from '../utils/Api';
import Authentication from './Authentication';
import { snackError } from '../utils/Snack';
import ModeSelector, { SelectedMode } from './ModeSelector';
import {
  ExfilExtension,
  STORAGES,
  StorageExtension,
} from './extensions/Extension';
import { initializeExfilExtensions } from './extensions/ExtensionManager';
import BasicSelector from './BasicSelector';
import CustomStepLabel from './ui/CustomSteps';

export default function Main() {
  const [api, _] = useState(new Api());
  const [authenticated, setAuthenticated] = useState<boolean>(false);
  const [config, setConfig] = useState<ApiConfigResponse | undefined>(
    undefined
  );
  const [mode, setMode] = useState<SelectedMode>('None');
  const [exfils, setExfils] = useState<ExfilExtension[]>([]);
  const [selectedExfil, setSelectedExfil] = useState<ExfilExtension | null>(
    null
  );
  const [selectedStorage, setSelectedStorage] =
    useState<StorageExtension | null>(null);
  const [step, setStep] = useState(0);
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
    setStep(step + 1);
  }

  function onModeSelected(type: SelectedMode, exfils: ExfilExtension[]): void {
    setMode(type);
    setExfils(exfils);
    setStep(step + 1);
  }

  function onExfilSelected(idx: number): void {
    setSelectedExfil(exfils[idx]);
    if (isUploadMode) setStep(step + 1);
    else setStep(step + 2); // We don't need to select a storage when all we'll do is downloading.
  }

  function onStorageSelected(idx: number): void {
    setSelectedStorage(STORAGES[idx]);
    setStep(step + 1);
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
  }

  return (
    <React.Fragment>
      <CssBaseline />
      <Container component="main" maxWidth="md" sx={{ mb: 4, mt: 4 }}>
        <Card sx={{ maxWidth: 1600 }}>
          <CardMedia sx={{ height: 200 }} image="vault.png" />
          <CardContent>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Lock color="primary" />
              <Typography variant="h4" component="div">
                Volatile Vault
              </Typography>
            </Stack>
          </CardContent>
          <CardContent>
            {authenticated === false && (
              <Authentication api={api} onAuthenticated={onAuthenticated} />
            )}
            {authenticated && (
              <>
                <Typography gutterBottom>
                  Welcome to Volatile Vault. This screen gives you fine-grained control over the way your data is being uploaded, downloaded and stored. Use the following wizard to configure your up- & downloads!
                </Typography>
                <Stepper activeStep={step} orientation="vertical">
                  <Step key={0}>
                    <StepLabel>
                      <Typography variant="subtitle1">
                        <i>Authenticated!</i>
                      </Typography>
                    </StepLabel>
                    <StepContent>
                      <Authentication
                        api={api}
                        onAuthenticated={onAuthenticated}
                      />
                    </StepContent>
                  </Step>
                  <Step key={1}>
                    <StepLabel>
                      <Typography variant="subtitle1">
                        {mode == 'None'
                          ? 'What would you like to do?'
                          : <i>You will {modeToString(mode)}.</i>}
                      </Typography>
                    </StepLabel>
                    <StepContent>
                      <ModeSelector
                        exfils={exfils}
                        onSelected={onModeSelected}
                      />
                    </StepContent>
                  </Step>
                  <Step key={2}>
                    <StepLabel>
                      <Typography variant="subtitle1">
                        {selectedExfil == null
                          ? 'Which transport should be used for exfiltration?'
                          : <i>You will use {selectedExfil.displayName} for exfiltration.</i>}
                      </Typography>
                    </StepLabel>
                    <StepContent>
                      <BasicSelector
                        items={exfils}
                        type="Exfil"
                        onSelected={onExfilSelected}
                      />
                    </StepContent>
                  </Step>
                  {/* TODO: Put exfil configure view here? */}
                  <Step key={3}>
                    <StepLabel>
                      <Typography variant="subtitle1">
                        {selectedStorage == null
                          ? isUploadMode
                            ? 'Which option should be used for storage?'
                            : <i>Downloads will determine the storage used automatically.</i>
                            : <i>You will use {selectedStorage.displayName} for storage.</i>}
                      </Typography>
                    </StepLabel>
                    <StepContent>
                      <BasicSelector
                        items={STORAGES}
                        type="Storage"
                        onSelected={onStorageSelected}
                      />
                    </StepContent>
                  </Step>
                  {step == 4 && (
                    <Step key={4}>
                      <CustomStepLabel stepNumber={55}>
                        <Typography variant="subtitle1">Let's go!</Typography>
                      </CustomStepLabel>
                      <StepContent>
                        <Typography variant="body2">
                          Does everything look right to you? Then let's
                          continue.
                        </Typography>
                        <Box sx={{ mb: 2 }}>
                          <div>
                            <Button variant="contained" sx={{ mt: 1, mr: 1 }}>
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
            )}
          </CardContent>
        </Card>
      </Container>
    </React.Fragment>
  );
}
