import { Button, Stack } from '@mui/material';
import { BaseExfilExtension } from './extensions/Extension';
import { ExfilTypes } from '../utils/Api';

export type SelectedMode =
  | 'None'
  | 'UploadSingle'
  | 'DownloadSingle'
  | 'UploadChunked'
  | 'DownloadChunked';

interface SelectorProps {
  exfils: BaseExfilExtension<ExfilTypes>[];
  onSelected: (type: SelectedMode, exfils: BaseExfilExtension<ExfilTypes>[]) => void;
}

export default function ModeSelector({ exfils, onSelected }: SelectorProps) {
  var hasUploadSingle = exfils.find((e) => e.canUploadSingle);
  var hasDownloadSingle = exfils.find((e) => e.canDownloadSingle);
  var hasUploadChunked = exfils.find((e) => e.canUploadChunked);
  var hasDownloadChunked = exfils.find((e) => e.canDownloadChunked);

  const onModeSelected = (type: SelectedMode) => {
    if (type === 'None') throw new Error('Invalid selector type None');
    const matchedExfils = exfils.filter((e) =>
      e.capabilities.find((c) => c === type)
    );

    onSelected(type, matchedExfils);
  };

  return (
    <Stack direction="column" spacing={2}>
      {(hasUploadSingle || hasDownloadSingle) && (
        <Stack direction="row" spacing={2}>
          {hasUploadSingle && (
            <Button
              variant="contained"
              onClick={() => onModeSelected('UploadSingle')}
            >
              Upload
            </Button>
          )}
          {hasDownloadSingle && (
            <Button
              variant="contained"
              onClick={() => onModeSelected('DownloadSingle')}
            >
              Download
            </Button>
          )}
        </Stack>
      )}
      {(hasUploadChunked || hasDownloadChunked) && (
        <Stack direction="row" spacing={2}>
          {hasUploadChunked && (
            <Button
              variant="contained"
              onClick={() => onModeSelected('UploadChunked')}
            >
              Chunked upload
            </Button>
          )}
          {hasDownloadChunked && (
            <Button
              variant="contained"
              onClick={() => onModeSelected('DownloadChunked')}
            >
              Chunked download
            </Button>
          )}
        </Stack>
      )}
    </Stack>
  );
}
