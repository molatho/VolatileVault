import Api from "../utils/Api";
import { ExfilExtension, StorageExtension } from "./extensions/Extension";

interface WizardProps {
    api: Api;
    onFinished: (exfil: ExfilExtension, storage?: StorageExtension) => void;
  }