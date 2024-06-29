import { Button, Stack } from '@mui/material';
import { ExfilExtension } from './extensions/Extension';

export type SelectedMode =
  | 'None'
  | 'UploadSingle'
  | 'DownloadSingle'
  | 'UploadChunked'
  | 'DownloadChunked';

interface SelectorProps {
  exfils: ExfilExtension[];
  onSelected: (type: SelectedMode, exfils: ExfilExtension[]) => void;
}

export default function ModeSelector({ exfils, onSelected }: SelectorProps) {
  var hasUploadSingle = exfils.find((e) =>
    e.capabilities.find((c) => c == 'UploadSingle')
  );
  var hasDownloadSingle = exfils.find((e) =>
    e.capabilities.find((c) => c == 'DownloadSingle')
  );
  var hasUploadChunked = exfils.find((e) =>
    e.capabilities.find((c) => c == 'UploadChunked')
  );
  var hasDownloadChunked = exfils.find((e) =>
    e.capabilities.find((c) => c == 'DownloadChunked')
  );

  const onModeSelected = (type: SelectedMode) => {
    if (type == 'None') throw new Error('Invalid selector type None');
    const matchedExfils = exfils.filter((e) =>
      e.capabilities.find((c) => c == type)
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
              Basic upload
            </Button>
          )}
          {hasDownloadSingle && (
            <Button
              variant="contained"
              onClick={() => onModeSelected('DownloadSingle')}
            >
              Basic download
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
