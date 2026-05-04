import { LocalLang } from "../../lib/i18n";
import { Row } from "../../lib/story";

export type StoryInputState = {
  start: string;
  end: string;
  baselineText: string;
  trAmount: string;
  trAsset: string;
  /** Optional "Current wallet balances" text — used by the Audit tab to compare
   *  the reconciled expected balance against what Binance actually shows now. */
  currentWalletText: string;
};

export type StoryInputSetters = {
  setStart: (v: string) => void;
  setEnd: (v: string) => void;
  setBaselineText: (v: string) => void;
  setTrAmount: (v: string) => void;
  setTrAsset: (v: string) => void;
  setCurrentWalletText: (v: string) => void;
};

export type StoryTabProps = {
  rows: Row[];
  lang: LocalLang;
  inputs: StoryInputState;
  setters: StoryInputSetters;
};
