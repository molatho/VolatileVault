import { Lock } from '@mui/icons-material';
import {
  CssBaseline,
  Typography,
  Container,
  Card,
  CardContent,
  CardMedia,
  Stack,
} from '@mui/material';
import React, { useState } from 'react';
import Api, { ApiConfigResponse } from '../utils/Api';
import { SelectedMode } from './ModeSelector';
import {
  ExfilDownloadViewProps,
  ExfilExtension,
  StorageExtension,
} from './extensions/Extension';
import BasicWizard from './BasicWizard';

export default function Main() {
  const [api, _] = useState(new Api());
  const [wizardDone, setWizardDone] = useState(false);
  const [config, setConfig] = useState<ApiConfigResponse | null>(null);
  const [mode, setMode] = useState<SelectedMode>('None');
  const [exfil, setExfil] = useState<ExfilExtension | null>(null);
  const [storage, setStorage] = useState<StorageExtension | null>(null);

  function onWizardFinished(
    config: ApiConfigResponse,
    mode: SelectedMode,
    exfil: ExfilExtension,
    storage?: StorageExtension
  ) {
    setConfig(config);
    setMode(mode);
    setExfil(exfil);
    setStorage(storage ? storage : null);
    setWizardDone(true);
  }

  function getExfilView() {
    if (exfil === null) return <>Exfil unset!</>;

    switch (mode) {
      case 'UploadSingle': {
        const View: (props: ExfilDownloadViewProps) => JSX.Element =
          exfil.uploadSingleView;
        return <View storage={storage as StorageExtension} />;
      }
      case 'DownloadSingle': {
        const View: () => JSX.Element = exfil.downloadSingleView;
        return <View />;
      }
      case 'UploadChunked': {
        const View: (props: ExfilDownloadViewProps) => JSX.Element =
          exfil.uploadChunkedView;
        return <View storage={storage as StorageExtension} />;
      }
      case 'DownloadChunked': {
        const View: () => JSX.Element = exfil.downloadChunkedView;
        return <View />;
      }
    }
  }

  function getModeString() {
    switch (mode) {
      case 'UploadSingle':
        return 'Basic upload';
      case 'DownloadSingle':
        return 'Basic download';
      case 'DownloadChunked':
        return 'Chunked download';
      case 'UploadChunked':
        return 'Chunked upload';
      default:
        throw new Error(`Invalid mode ${mode} at this stage!`);
    }
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
            {wizardDone === false && (
              <BasicWizard api={api} onFinished={onWizardFinished} />
            )}
            {wizardDone && (
              <>
                <Typography variant="h6">
                  {exfil?.displayName} - {getModeString()}
                </Typography>
                {getExfilView()}
              </>
            )}
          </CardContent>
        </Card>
      </Container>
    </React.Fragment>
  );
}
