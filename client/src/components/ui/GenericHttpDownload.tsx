import React, { useEffect, useState } from 'react';
import EnterPassword from '../EnterPassword';
import {
  Box,
  Button,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { enqueueSnackbar } from 'notistack';
import { formatSize } from '../../utils/Files';
import { decryptSymmetric } from '../../utils/Crypto';
import DownloadIcon from '@mui/icons-material/Download';
import { saveAs } from 'file-saver';
import jszip from 'jszip';
import moment from 'moment';
import { ExfilExtension } from '../extensions/Extension';
import { SelectedMode } from '../ModeSelector';
import EventTable, { createLogEntry, EventEntry } from './EventTable';

interface DownloadBlobProps {
  exfil: ExfilExtension;
  mode: SelectedMode;
  enabled?: boolean;
  onDownloaded: (id: string, blob: ArrayBuffer) => void;
  onExfilEvent: (
    category: string,
    content: string,
    variant?: 'error' | 'success'
  ) => void;
}

function DownloadBlob({
  exfil,
  mode,
  enabled = true,
  onDownloaded,
  onExfilEvent,
}: DownloadBlobProps) {
  const [id, setId] = useState('');
  const [canDownload, setCanDownload] = useState(false);
  const [canEdit, setCanEdit] = useState(true);
  const [downloadError, setDownloadError] = useState('');

  const onIdChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setCanDownload(true);
    setDownloadError('');
    setId(event.currentTarget.value);
  };

  const onDownload = async () => {
    setCanDownload(false);
    setCanEdit(false);
    setDownloadError('');
    try {
      //TODO: add EventTable!
      const res =
        mode === 'DownloadSingle'
          ? await exfil.downloadSingle(id, onExfilEvent)
          : await exfil.downloadChunked(id, onExfilEvent);

      enqueueSnackbar({
        message: `Downloaded ${formatSize(res.data.byteLength)} of data!`,
        variant: 'success',
      });
      onDownloaded(id, res.data);
    } catch (err) {
      enqueueSnackbar({
        message: `Download failed: ${err}`,
        variant: 'error',
      });
      setDownloadError('Download error');
      setTimeout(() => {
        setCanDownload(true);
        setCanEdit(true);
      }, 3000);
    }
  };

  return (
    <>
      <Typography variant="h5" px={2}>
        Download ID
      </Typography>
      <Stack direction="row" spacing={2} sx={{ width: '100%' }}>
        <TextField
          label="ID"
          id="outlined-code-small"
          value={id}
          size="small"
          InputProps={{ readOnly: !enabled || !canEdit }}
          onChange={onIdChange}
          error={downloadError ? true : false}
        />
        <Button
          variant="contained"
          disabled={!enabled || !id || !canDownload}
          onClick={onDownload}
        >
          Download
        </Button>
      </Stack>
    </>
  );
}

interface DownloadProps {
  exfil: ExfilExtension;
  mode: SelectedMode;
}

export default function GenericHttpDownload({ exfil, mode }: DownloadProps) {
  interface FileInfo {
    name: string;
    date: Date;
  }
  const [id, setId] = useState('');
  const [blob, setBlob] = useState<ArrayBuffer | null>(null);
  const [password, setPassword] = useState('');
  const [canDecrypt, setCanDecrypt] = useState(true);
  const [isDecrypted, setIsDecrypted] = useState(false);
  const [files, setFiles] = useState<FileInfo[]>([]);
  var [entries, setEntries] = useState<EventEntry[]>([]);

  if (mode !== 'DownloadChunked' && mode !== 'DownloadSingle')
    throw new Error(`Unsupported mode ${mode}`);

  const doDecrypt = () => {
    setCanDecrypt(false);

    if (!blob)
      return enqueueSnackbar({
        message: 'Downloaded data uninitialized',
        variant: 'error',
      });
    if (blob.byteLength < 13)
      return enqueueSnackbar({
        message: `Downloaded data insufficient (${blob.byteLength} bytes)`,
        variant: 'error',
      });

    decryptSymmetric(blob.slice(12), blob.slice(0, 12), password)
      .then((res) => {
        setBlob(res);
        setIsDecrypted(true);
        enqueueSnackbar({
          message: 'Successfully decrypted the data!',
          variant: 'success',
        });
      })
      .catch((err) => {
        enqueueSnackbar({
          message: `Error decrypting data: ${
            err?.message ?? 'General failure'
          }`,
          variant: 'error',
        });
        setCanDecrypt(true);
      });
  };

  useEffect(() => {
    if (!isDecrypted) return;
    const zip = jszip();
    zip.loadAsync(blob as ArrayBuffer).then((_zip) => {
      setFiles(
        Object.keys(_zip.files).map((name) => {
          return { name: name, date: _zip.files[name].date };
        })
      );
    });
  }, [isDecrypted]);

  const save = () => {
    saveAs(new Blob([blob as ArrayBuffer]), `${id}.zip`);
  };

  const addEntry = (
    category: string,
    content: string,
    variant?: 'error' | 'success'
  ) => {
    entries = [...entries, createLogEntry(category, content, variant)];
    setEntries(entries);
  };

  return (
    <Stack direction="column" spacing={4} mt={2}>
      <DownloadBlob
        exfil={exfil}
        mode={mode}
        onDownloaded={(id, blob) => {
          setBlob(blob);
          setId(id);
        }}
        enabled={blob === null}
        onExfilEvent={addEntry}
      />
      <EnterPassword
        onPasswordEntered={setPassword}
        confirm={false}
        enabled={blob !== null && canDecrypt}
      >
        <Button
          variant="contained"
          disabled={blob === null || !canDecrypt}
          onClick={doDecrypt}
        >
          Decrypt
        </Button>
      </EnterPassword>

      <Typography variant="h5" px={2}>
        Contents
      </Typography>

      <TableContainer component={Paper} sx={{ maxHeight: '300px' }}>
        <Table aria-label="simple table" size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold' }}>Name</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Date</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {files.map((f, i) => (
              <TableRow key={i}>
                <TableCell>{f.name}</TableCell>
                <TableCell>
                  {moment(f.date).format('YYYY MM DD - HH:mm:ss')}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Box display="flex" justifyContent="flex-end">
        <Button
          onClick={save}
          color="success"
          variant="contained"
          disabled={!isDecrypted}
          startIcon={<DownloadIcon />}
        >
          Download
        </Button>
      </Box>

      <Typography variant="h5" px={2}>
        Log
      </Typography>

      <EventTable entries={entries} />
    </Stack>
  );
}
