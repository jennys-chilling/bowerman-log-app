import React, { useState, useEffect } from 'react';
import { appClient } from '@/api/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { AppHeader, AppPage } from '@/components/AppChrome';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Pencil, Archive, Loader2, LogOut, UserCircle, Trash2, Footprints } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const SHOE_TYPES = ['Trainer', 'Workout', 'Spike', 'Trail', 'Racing Flat'];
const SHOE_COLORS = [
  { name: 'Sport Red', value: 'bg-red-700' },
  { name: 'Crimson', value: 'bg-rose-600' },
  { name: 'Pink', value: 'bg-pink-500' },
  { name: 'Purple', value: 'bg-purple-600' },
  { name: 'Indigo', value: 'bg-indigo-600' },
  { name: 'Blue', value: 'bg-blue-600' },
  { name: 'Sky', value: 'bg-sky-500' },
  { name: 'Teal', value: 'bg-teal-500' },
  { name: 'Green', value: 'bg-green-600' },
  { name: 'Signal Orange', value: 'bg-orange-500' },
  { name: 'Gold', value: 'bg-yellow-500' },
  { name: 'Black', value: 'bg-slate-900' },
  { name: 'White', value: 'bg-white border border-slate-300' },
  { name: 'Volt', value: 'bg-lime-400' },
  { name: 'Track Gray', value: 'bg-slate-500' },
  { name: 'Forest', value: 'bg-emerald-700' },
];

const DEFAULT_MAX_MILEAGE = 500;

export default function ShoeInventory() {
  const queryClient = useQueryClient();
  const { logout } = useAuth();
  const location = useLocation();
  const trainingLogUrl = `${createPageUrl('TrainingLog')}${location.search}`;
  const accountUrl = `${createPageUrl('Account')}${location.search}`;
  const [user, setUser] = useState(null);
  const [showEditor, setShowEditor] = useState(false);
  const [editingShoe, setEditingShoe] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    model: '',
    type: 'Trainer',
    color: 'bg-red-700',
    current_mileage: '',
    max_mileage: String(DEFAULT_MAX_MILEAGE),
    status: 'Active',
  });
  
  useEffect(() => {
    appClient.auth.me().then(setUser);
  }, []);
  
  const { data: shoes = [], isLoading } = useQuery({
    queryKey: ['shoes', user?.id],
    queryFn: () => appClient.entities.Shoe.filter({ athlete_id: user.id }),
    enabled: !!user?.id,
  });
  
  const createShoeMutation = useMutation({
    mutationFn: (data) => appClient.entities.Shoe.create({ ...data, athlete_id: user.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shoes'] });
      setShowEditor(false);
      resetForm();
    },
  });
  
  const updateShoeMutation = useMutation({
    mutationFn: ({ id, data }) => appClient.entities.Shoe.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shoes'] });
      setShowEditor(false);
      resetForm();
    },
  });

  const deleteShoeMutation = useMutation({
    mutationFn: (id) => appClient.entities.Shoe.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['shoes'] }),
  });
  
  const resetForm = () => {
    setEditingShoe(null);
    setFormData({
      name: '',
      model: '',
      type: 'Trainer',
      color: 'bg-red-700',
      current_mileage: '',
      max_mileage: String(DEFAULT_MAX_MILEAGE),
      status: 'Active',
    });
  };
  
  const handleEdit = (shoe) => {
    setEditingShoe(shoe);
    setFormData({
      name: shoe.name,
      model: shoe.model,
      type: shoe.type,
      color: shoe.color || 'bg-red-700',
      current_mileage: shoe.current_mileage ? String(shoe.current_mileage) : '',
      max_mileage: String(shoe.max_mileage || DEFAULT_MAX_MILEAGE),
      status: shoe.status,
    });
    setShowEditor(true);
  };
  
  const handleSave = () => {
    const data = {
      ...formData,
      current_mileage: parseFloat(formData.current_mileage) || 0,
      max_mileage: parseFloat(formData.max_mileage) || DEFAULT_MAX_MILEAGE,
    };

    if (editingShoe) {
      updateShoeMutation.mutate({ id: editingShoe.id, data });
    } else {
      createShoeMutation.mutate(data);
    }
  };
  
  const handleRetire = (shoe) => {
    updateShoeMutation.mutate({
      id: shoe.id,
      data: { status: shoe.status === 'Active' ? 'Retired' : 'Active' },
    });
  };

  const handleDelete = (shoe) => {
    if (!window.confirm(`Permanently delete ${shoe.name}? This cannot be undone.`)) return;
    deleteShoeMutation.mutate(shoe.id);
  };
  
  const activeShoes = shoes.filter(s => s.status === 'Active');
  const retiredShoes = shoes.filter(s => s.status === 'Retired');
  
  const getMaxMileage = (shoe) => Number(shoe.max_mileage) || DEFAULT_MAX_MILEAGE;
  const getMileagePercent = (shoe) => Math.min(((shoe.current_mileage || 0) / getMaxMileage(shoe)) * 100, 100);
  const getMileageColor = (shoe) => {
    const percent = getMileagePercent(shoe);
    if (percent < 50) return 'btc-progress-low';
    if (percent < 75) return 'btc-progress-mid';
    return 'btc-progress-high';
  };
  
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center dark:bg-slate-950">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }
  
  return (
    <div className="btc-app-shell text-slate-900 dark:text-slate-100">
      <AppPage maxWidth="max-w-5xl">
        <AppHeader
          title="Bowerman Training Log"
          subtitle="Shoes"
          backTo={trainingLogUrl}
          actions={(
            <>
              <Button className="h-9 rounded-full px-3 text-sm font-semibold sm:px-4" onClick={() => setShowEditor(true)}>
                <Plus className="w-4 h-4 mr-2" /> Add Shoe
              </Button>
              <Link to={accountUrl}>
                <Button variant="outline" size="sm" className="h-9 rounded-full px-3 text-sm font-semibold sm:px-4">
                  <UserCircle className="mr-1.5 h-4 w-4" />
                  Account
                </Button>
              </Link>
              <Button variant="ghost" size="sm" className="h-9 rounded-full px-3" onClick={() => logout()}>
                <LogOut className="mr-1.5 h-4 w-4" />
                Sign Out
              </Button>
            </>
          )}
        />
        
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
          </div>
        ) : (
          <>
            {/* Active Shoes */}
            <Card className="btc-panel mb-4 sm:mb-6">
              <CardHeader className="px-4 py-4 sm:px-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <span className="btc-status-dot-active w-2 h-2 rounded-full"></span>
                  Active Shoes ({activeShoes.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 sm:px-6 sm:pb-6">
                {activeShoes.length === 0 ? (
                  <p className="text-slate-500 text-center py-8 dark:text-slate-400">No active shoes. Add your first pair!</p>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2 md:gap-4">
                    {activeShoes.map(shoe => (
                      <div key={shoe.id} className="rounded-xl border border-slate-300 bg-slate-50 p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                          <div className="flex min-w-0 flex-1 items-start gap-3">
                            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${shoe.color || 'bg-red-700'} text-white shadow-sm`}>
                              <Footprints className="h-5 w-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <h4 className="truncate font-semibold text-slate-800 dark:text-slate-100">{shoe.name}</h4>
                              <p className="truncate text-sm text-slate-500 dark:text-slate-400">{shoe.model}</p>
                              <Badge variant="outline" className="mt-1 text-xs">{shoe.type}</Badge>
                            </div>
                          </div>
                          <div className="flex shrink-0 justify-end gap-1 self-end sm:self-start">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(shoe)}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleRetire(shoe)}>
                              <Archive className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-red-700 dark:text-slate-400 dark:hover:text-red-300" onClick={() => handleDelete(shoe)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        
                        <div className="mt-4">
                          <div className="mb-1 flex justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
                            <span>Mileage</span>
                            <span className="shrink-0">{(shoe.current_mileage || 0).toFixed(1)} / {getMaxMileage(shoe).toFixed(0)} mi</span>
                          </div>
                          <div className="h-2 bg-slate-200 rounded-full overflow-hidden dark:bg-slate-800">
                            <div 
                              className={`h-full ${getMileageColor(shoe)} transition-all`}
                              style={{ width: `${getMileagePercent(shoe)}%` }}
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
              <Card className="btc-panel">
                <CardHeader className="px-4 py-4 sm:px-6">
                  <CardTitle className="flex items-center gap-2 text-base text-slate-500 dark:text-slate-400 sm:text-lg">
                    <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                    Retired Shoes ({retiredShoes.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4 sm:px-6 sm:pb-6">
                  <div className="grid gap-3 md:hidden">
                    {retiredShoes.map(shoe => (
                      <div key={shoe.id} className="rounded-xl border border-slate-300 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h4 className="truncate font-semibold text-slate-700 dark:text-slate-200">{shoe.name}</h4>
                            <p className="truncate text-sm text-slate-500 dark:text-slate-400">{shoe.model}</p>
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                              <Badge variant="outline" className="text-xs">{shoe.type}</Badge>
                              <span>{(shoe.current_mileage || 0).toFixed(1)} mi</span>
                            </div>
                          </div>
                          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-slate-500 hover:text-red-700 dark:text-slate-400 dark:hover:text-red-300" onClick={() => handleDelete(shoe)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <Button variant="outline" size="sm" className="mt-3 w-full" onClick={() => handleRetire(shoe)}>
                          Reactivate
                        </Button>
                      </div>
                    ))}
                  </div>

                  <div className="hidden md:block">
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
                          <TableRow key={shoe.id} className="text-slate-500 dark:text-slate-400">
                            <TableCell className="font-medium">{shoe.name}</TableCell>
                            <TableCell>{shoe.model}</TableCell>
                            <TableCell>{shoe.type}</TableCell>
                            <TableCell>{(shoe.current_mileage || 0).toFixed(1)} mi</TableCell>
                            <TableCell>
                              <div className="flex justify-end gap-1">
                                <Button variant="ghost" size="sm" onClick={() => handleRetire(shoe)}>
                                  Reactivate
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-red-700 dark:text-slate-400 dark:hover:text-red-300" onClick={() => handleDelete(shoe)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </AppPage>
      
      {/* Shoe Editor */}
      <Dialog open={showEditor} onOpenChange={(open) => { if (!open) { setShowEditor(false); resetForm(); } }}>
        <DialogContent className="max-h-[90vh] w-[calc(100vw-1.5rem)] max-w-lg overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>{editingShoe ? 'Edit Shoe' : 'Add New Shoe'}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-2 sm:py-4">
            <div className="grid gap-4 sm:grid-cols-2">
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
            
            <div className="grid gap-4 sm:grid-cols-2">
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
                  min="0"
                  step="0.1"
                  value={formData.current_mileage}
                  onChange={(e) => setFormData({ ...formData, current_mileage: e.target.value })}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Max Mileage</Label>
              <Input
                type="number"
                min="1"
                step="1"
                value={formData.max_mileage}
                onChange={(e) => setFormData({ ...formData, max_mileage: e.target.value })}
                placeholder="500"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex gap-2 flex-wrap">
                {SHOE_COLORS.map(color => (
                  <button
                    key={color.value}
                    onClick={() => setFormData({ ...formData, color: color.value })}
                    className={`w-8 h-8 rounded-full ${color.value} ${formData.color === color.value ? 'ring-2 ring-offset-2 ring-slate-400 dark:ring-offset-slate-950' : ''}`}
                    title={color.name}
                  />
                ))}
              </div>
            </div>
          </div>
          
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" className="w-full sm:w-auto" onClick={() => { setShowEditor(false); resetForm(); }}>Cancel</Button>
            <Button className="w-full sm:w-auto" onClick={handleSave} disabled={!formData.name || !formData.model}>
              {editingShoe ? 'Update' : 'Add'} Shoe
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
