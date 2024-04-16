import React, { useEffect, useState } from 'react';
import Api, { ApiConfigResponse } from '../../../../utils/Api';
import EnterPassword from '../../../EnterPassword';
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
import { formatSize } from '../../../../utils/Files';
import { decryptSymmetric } from '../../../../utils/Crypto';
import DownloadIcon from '@mui/icons-material/Download';
import { saveAs } from 'file-saver';
import jszip from 'jszip';
import moment from 'moment';

interface DownloadBlobProps {
  api: Api;
  enabled?: boolean;
  onDownloaded: (id: string, blob: ArrayBuffer) => void;
}

export function DownloadBlob({
  api,
  enabled = true,
  onDownloaded,
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

  const onDownload = () => {
    setCanDownload(false);
    setCanEdit(false);
    setDownloadError('');
    api
      .download(id)
      .then((res) => {
        enqueueSnackbar({
          message: `Downloaded ${formatSize(res.data.byteLength)} of data!`,
          variant: 'success',
        });
        onDownloaded(id, res.data);
      })
      .catch((err) => {
        enqueueSnackbar({
          message: `Download failed: ${err?.message ?? JSON.stringify(err)}`,
          variant: 'error',
        });
        setDownloadError(err?.message ?? 'Download error');
        setTimeout(() => {
          setCanDownload(true);
          setCanEdit(true);
        }, 3000);
      });
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
  api: Api;
  config: ApiConfigResponse;
}

export default function BasicHTTPDownload({ api, config }: DownloadProps) {
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

  return (
    <Stack direction="column" spacing={4} mt={2}>
      <DownloadBlob
        api={api}
        onDownloaded={(id, blob) => {
          setBlob(blob);
          setId(id);
        }}
        enabled={blob == null}
      />
      <EnterPassword
        onPasswordEntered={setPassword}
        confirm={false}
        enabled={blob != null && canDecrypt}
      >
        <Button
          variant="contained"
          disabled={blob == null || !canDecrypt}
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
    </Stack>
  );
}
