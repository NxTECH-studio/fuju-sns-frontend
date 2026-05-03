import { useContext } from "react";
import {
  FujuModelClientContext,
  type FujuModelClientValue,
} from "../state/fujuModelClientContext";

export function useFujuModelClient(): FujuModelClientValue {
  const value = useContext(FujuModelClientContext);
  if (!value) {
    throw new Error(
      "FujuModelClientProvider is missing. Wrap your tree with <FujuModelClientProvider>."
    );
  }
  return value;
}
