import { Construction } from "lucide-react";
import { EmptyState } from "@/components/feedback/states";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";

/** Placeholder for modules scheduled for later frontend phases. Shows no fake data. */
export function ModulePlaceholder({ title, description }: { title: string; description: string }) {
  return (
    <>
      <PageHeader title={title} description={description} />
      <Card>
        <EmptyState icon={<Construction />} title="Coming in a later phase" description="This module is part of the roadmap and is not built yet." className="py-16" />
      </Card>
    </>
  );
}
