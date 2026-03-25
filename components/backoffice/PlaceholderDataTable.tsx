import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import ConfirmAction from "./ConfirmAction";

const sampleRows = [
  { name: "Placeholder Item A", status: "draft", updated: "Today" },
  { name: "Placeholder Item B", status: "published", updated: "Yesterday" },
  { name: "Placeholder Item C", status: "pending", updated: "2 days ago" },
];

const statusTone: Record<string, "outline" | "default"> = {
  draft: "outline",
  published: "default",
  pending: "outline",
};

const PlaceholderDataTable = () => {
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button size="sm" variant="outline">
          Bulk action
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Updated</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sampleRows.map((row) => (
            <TableRow key={row.name}>
              <TableCell className="font-medium">{row.name}</TableCell>
              <TableCell>
                <Badge variant={statusTone[row.status] ?? "outline"}>
                  {row.status}
                </Badge>
              </TableCell>
              <TableCell>{row.updated}</TableCell>
              <TableCell className="text-right space-x-2">
                <Button size="sm" variant="ghost">
                  Edit
                </Button>
                <ConfirmAction
                  title="Confirm delete"
                  description="This action is for placeholder only."
                  trigger={
                    <Button size="sm" variant="ghost" className="text-red-600">
                      Delete
                    </Button>
                  }
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default PlaceholderDataTable;
