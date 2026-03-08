import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Plus, Pencil, Archive, ArrowLeft, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const SHOE_TYPES = ['Trainer', 'Workout', 'Spike', 'Trail', 'Racing Flat'];
const SHOE_COLORS = [
  { name: 'Blue', value: 'bg-blue-500' },
  { name: 'Red', value: 'bg-red-500' },
  { name: 'Green', value: 'bg-emerald-500' },
  { name: 'Orange', value: 'bg-orange-500' },
  { name: 'Purple', value: 'bg-purple-500' },
  { name: 'Pink', value: 'bg-pink-500' },
  { name: 'Gray', value: 'bg-slate-500' },
  { name: 'Black', value: 'bg-slate-900' },
];

const MAX_MILEAGE = 500; // Standard shoe lifespan

export default function ShoeInventory() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [showEditor, setShowEditor] = useState(false);
  const [editingShoe, setEditingShoe] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    model: '',
    type: 'Trainer',
    color: 'bg-blue-500',
    current_mileage: 0,
    status: 'Active',
  });
  
  useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);
  
  const { data: shoes = [], isLoading } = useQuery({
    queryKey: ['shoes', user?.id],
    queryFn: () => base44.entities.Shoe.filter({ athlete_id: user.id }),
    enabled: !!user?.id,
  });
  
  const createShoeMutation = useMutation({
    mutationFn: (data) => base44.entities.Shoe.create({ ...data, athlete_id: user.id }),
    onSuccess: () => {
      queryClient.invalidateQueries(['shoes']);
      setShowEditor(false);
      resetForm();
    },
  });
  
  const updateShoeMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Shoe.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['shoes']);
      setShowEditor(false);
      resetForm();
    },
  });
  
  const resetForm = () => {
    setEditingShoe(null);
    setFormData({
      name: '',
      model: '',
      type: 'Trainer',
      color: 'bg-blue-500',
      current_mileage: 0,
      status: 'Active',
    });
  };
  
  const handleEdit = (shoe) => {
    setEditingShoe(shoe);
    setFormData({
      name: shoe.name,
      model: shoe.model,
      type: shoe.type,
      color: shoe.color || 'bg-blue-500',
      current_mileage: shoe.current_mileage || 0,
      status: shoe.status,
    });
    setShowEditor(true);
  };
  
  const handleSave = () => {
    if (editingShoe) {
      updateShoeMutation.mutate({ id: editingShoe.id, data: formData });
    } else {
      createShoeMutation.mutate(formData);
    }
  };
  
  const handleRetire = (shoe) => {
    updateShoeMutation.mutate({
      id: shoe.id,
      data: { status: shoe.status === 'Active' ? 'Retired' : 'Active' },
    });
  };
  
  const activeShoes = shoes.filter(s => s.status === 'Active');
  const retiredShoes = shoes.filter(s => s.status === 'Retired');
  
  const getMileagePercent = (mileage) => Math.min((mileage / MAX_MILEAGE) * 100, 100);
  const getMileageColor = (mileage) => {
    const percent = getMileagePercent(mileage);
    if (percent < 50) return 'bg-emerald-500';
    if (percent < 75) return 'bg-amber-500';
    return 'bg-red-500';
  };
  
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link to={createPageUrl('TrainingLog')}>
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">👟 Shoe Inventory</h1>
              <p className="text-slate-500 text-sm">Track your training shoes</p>
            </div>
          </div>
          
          <Button onClick={() => setShowEditor(true)}>
            <Plus className="w-4 h-4 mr-2" /> Add Shoe
          </Button>
        </div>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
          </div>
        ) : (
          <>
            {/* Active Shoes */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  Active Shoes ({activeShoes.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {activeShoes.length === 0 ? (
                  <p className="text-slate-500 text-center py-8">No active shoes. Add your first pair!</p>
                ) : (
                  <div className="grid md:grid-cols-2 gap-4">
                    {activeShoes.map(shoe => (
                      <div key={shoe.id} className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                        <div className="flex items-start gap-3">
                          <div className={`w-10 h-10 rounded-lg ${shoe.color || 'bg-blue-500'} flex items-center justify-center text-white text-lg`}>
                            👟
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-slate-800 truncate">{shoe.name}</h4>
                            <p className="text-sm text-slate-500 truncate">{shoe.model}</p>
                            <Badge variant="outline" className="mt-1 text-xs">{shoe.type}</Badge>
                          </div>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(shoe)}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleRetire(shoe)}>
                              <Archive className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        
                        <div className="mt-4">
                          <div className="flex justify-between text-xs text-slate-500 mb-1">
                            <span>Mileage</span>
                            <span>{(shoe.current_mileage || 0).toFixed(1)} / {MAX_MILEAGE} mi</span>
                          </div>
                          <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${getMileageColor(shoe.current_mileage || 0)} transition-all`}
                              style={{ width: `${getMileagePercent(shoe.current_mileage || 0)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Retired Shoes */}
            {retiredShoes.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg text-slate-500">
                    <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                    Retired Shoes ({retiredShoes.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Model</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Final Mileage</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {retiredShoes.map(shoe => (
                        <TableRow key={shoe.id} className="text-slate-500">
                          <TableCell className="font-medium">{shoe.name}</TableCell>
                          <TableCell>{shoe.model}</TableCell>
                          <TableCell>{shoe.type}</TableCell>
                          <TableCell>{(shoe.current_mileage || 0).toFixed(1)} mi</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm" onClick={() => handleRetire(shoe)}>
                              Reactivate
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
      
      {/* Shoe Editor */}
      <Dialog open={showEditor} onOpenChange={(open) => { if (!open) { setShowEditor(false); resetForm(); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingShoe ? 'Edit Shoe' : 'Add New Shoe'}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nickname</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Daily Trainers"
                />
              </div>
              <div className="space-y-2">
                <Label>Model</Label>
                <Input
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  placeholder="e.g., Nike Pegasus 40"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SHOE_TYPES.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Current Mileage</Label>
                <Input
                  type="number"
                  value={formData.current_mileage}
                  onChange={(e) => setFormData({ ...formData, current_mileage: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex gap-2 flex-wrap">
                {SHOE_COLORS.map(color => (
                  <button
                    key={color.value}
                    onClick={() => setFormData({ ...formData, color: color.value })}
                    className={`w-8 h-8 rounded-full ${color.value} ${formData.color === color.value ? 'ring-2 ring-offset-2 ring-slate-400' : ''}`}
                    title={color.name}
                  />
                ))}
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowEditor(false); resetForm(); }}>Cancel</Button>
            <Button onClick={handleSave} disabled={!formData.name || !formData.model}>
              {editingShoe ? 'Update' : 'Add'} Shoe
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}