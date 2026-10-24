import { localizedTitle } from "@/i18n/server";
import { NewSample } from "@/features/portal/new-sample";

export const generateMetadata = () => localizedTitle("Request a sample");

export default function Page() {
  return <NewSample />;
}
