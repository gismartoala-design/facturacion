import { PageLoadingState } from "@/shared/states/page-loading-state";

export default function PosLoading() {
  return <PageLoadingState message="Cargando modulo POS..." fullScreen size={30} />;
}
