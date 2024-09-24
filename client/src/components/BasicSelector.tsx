import { useState } from 'react';
import { BasicInfoHolder } from './extensions/Extension';
import { styled } from '@mui/material/styles';
import ArrowForwardIosSharpIcon from '@mui/icons-material/ArrowForwardIosSharp';
import MuiAccordion, { AccordionProps } from '@mui/material/Accordion';
import MuiAccordionSummary, {
  AccordionSummaryProps,
} from '@mui/material/AccordionSummary';
import MuiAccordionDetails from '@mui/material/AccordionDetails';
import Typography from '@mui/material/Typography';
import { AccordionActions, Button } from '@mui/material';

const Accordion = styled((props: AccordionProps) => (
  <MuiAccordion disableGutters elevation={0} square {...props} />
))(({ theme }) => ({
  border: `1px solid ${theme.palette.divider}`,
  '&:not(:last-child)': {
    borderBottom: 0,
  },
  '&::before': {
    display: 'none',
  },
}));

const AccordionSummary = styled((props: AccordionSummaryProps) => (
  <MuiAccordionSummary
    expandIcon={<ArrowForwardIosSharpIcon sx={{ fontSize: '0.9rem' }} />}
    {...props}
  />
))(({ theme }) => ({
  backgroundColor:
    theme.palette.mode === 'dark'
      ? 'rgba(255, 255, 255, .05)'
      : 'rgba(0, 0, 0, .03)',
  flexDirection: 'row-reverse',
  '& .MuiAccordionSummary-expandIconWrapper.Mui-expanded': {
    transform: 'rotate(90deg)',
  },
  '& .MuiAccordionSummary-content': {
    marginLeft: theme.spacing(1),
  },
}));

const AccordionDetails = styled(MuiAccordionDetails)(({ theme }) => ({
  padding: theme.spacing(2),
  borderTop: '1px solid rgba(0, 0, 0, .125)',
}));

type SelectorType = 'Exfil' | 'Storage';

interface BasicSelectorProps {
  type: SelectorType;
  items: BasicInfoHolder[];
  onSelected: (idx: number) => void;
}

export default function BasicSelector({
  type,
  items,
  onSelected,
}: BasicSelectorProps) {
  const [expanded, setExpanded] = useState(0);

  return (
    <>
      {items.map((item, idx) => (
        <Accordion
          key={idx}
          expanded={expanded === idx || items.length === 1}
          onChange={() => setExpanded(idx)}
        >
          <AccordionSummary>
            <Typography>{item.displayName}</Typography>
          </AccordionSummary>
          <AccordionDetails>{item.description}</AccordionDetails>
          <AccordionActions>
            <Button onClick={() => onSelected(idx)}>Select</Button>
          </AccordionActions>
        </Accordion>
      ))}
    </>
  );
}
