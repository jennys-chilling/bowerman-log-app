import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";

export default function SplitsEditor({ open, onClose, dayPlan, date, onSave }) {
  const [splits, setSplits] = useState([]);
  
  useEffect(() => {
    if (dayPlan?.splits?.length > 0) {
      setSplits(dayPlan.splits);
    } else {
      setSplits([{ rep_number: 1, distance: '', time: '', rest: '', notes: '' }]);
    }
  }, [dayPlan, open]);
  
  const addSplit = () => {
    setSplits([
      ...splits,
      { rep_number: splits.length + 1, distance: '', time: '', rest: '', notes: '' }
    ]);
  };
  
  const removeSplit = (index) => {
    const newSplits = splits.filter((_, i) => i !== index).map((s, i) => ({
      ...s,
      rep_number: i + 1,
    }));
    setSplits(newSplits);
  };
  
  const updateSplit = (index, field, value) => {
    const newSplits = [...splits];
    newSplits[index] = { ...newSplits[index], [field]: value };
    setSplits(newSplits);
  };
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-slate-400 text-sm">Workout Splits:</span>
            {date && format(date, 'EEEE, MMM d')}
          </DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">Rep</TableHead>
                <TableHead>Distance</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Rest</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {splits.map((split, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium text-center">{split.rep_number}</TableCell>
                  <TableCell>
                    <Input
                      value={split.distance}
                      onChange={(e) => updateSplit(index, 'distance', e.target.value)}
                      placeholder="400m"
                      className="h-8"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={split.time}
                      onChange={(e) => updateSplit(index, 'time', e.target.value)}
                      placeholder="1:12"
                      className="h-8"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={split.rest}
                      onChange={(e) => updateSplit(index, 'rest', e.target.value)}
                      placeholder="90s"
                      className="h-8"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={split.notes}
                      onChange={(e) => updateSplit(index, 'notes', e.target.value)}
                      placeholder="Felt good"
                      className="h-8"
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => removeSplit(index)}
                      disabled={splits.length === 1}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={addSplit}
          >
            <Plus className="w-4 h-4 mr-1" /> Add Rep
          </Button>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave(splits)}>Save Splits</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}