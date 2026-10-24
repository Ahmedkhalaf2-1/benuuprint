import { localizedTitle } from "@/i18n/server";
import { RequirePermission } from "@/features/auth/require-permission";
import { EditSamplePage } from "@/features/samples/sample-editor-pages";

export const generateMetadata = () => localizedTitle("Edit sample");

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  return <RequirePermission permission="samples.manage"><EditSamplePage id={(await params).id} /></RequirePermission>;
}
