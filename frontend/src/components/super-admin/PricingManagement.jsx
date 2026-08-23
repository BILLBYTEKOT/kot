import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { toast } from 'sonner';
import { DollarSign, History, Save } from 'lucide-react';
import { usePricing } from '../../hooks/usePricing';

const PricingManagement = ({ token }) => {
  const { pricing, history, loading, updatePricing } = usePricing(token);
  const [showHistory, setShowHistory] = useState(false);
  const [changes, setChanges] = useState({});
  const [reason, setReason] = useState('');
  const [showReasonDialog, setShowReasonDialog] = useState(false);

  if (loading && !pricing) {
    return <div className="p-6 text-center">Loading pricing configuration...</div>;
  }

  if (!pricing) {
    return <div className="p-6 text-red-600">Failed to load pricing configuration</div>;
  }

  const handleFieldChange = (field, value) => {
    setChanges({ ...changes, [field]: value });
  };

  const handleSaveChanges = async () => {
    if (Object.keys(changes).length === 0) {
      toast.error('No changes to save');
      return;
    }
    setShowReasonDialog(true);
  };

  const confirmSave = async () => {
    const result = await updatePricing(changes, reason);
    if (result.success) {
      setChanges({});
      setReason('');
      setShowReasonDialog(false);
    }
  };

  const fields = [
    { key: 'regular_price', label: 'Regular Price (INR)', icon: '₹' },
    { key: 'campaign_price', label: 'Campaign Price (INR)', icon: '₹' },
    { key: 'referral_discount', label: 'Referral Discount (INR)', icon: '₹' },
    { key: 'referral_reward', label: 'Referral Reward (INR)', icon: '₹' },
    { key: 'trial_days', label: 'Trial Days', icon: '📅' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <DollarSign className="w-6 h-6 text-blue-600" />
          Pricing Configuration
        </h2>
        <Button
          variant="outline"
          onClick={() => setShowHistory(!showHistory)}
          className="flex items-center gap-2"
        >
          <History className="w-4 h-4" />
          History
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Current Pricing</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {fields.map((field) => (
              <div key={field.key}>
                <Label>{field.label}</Label>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-2.5 text-gray-500">{field.icon}</span>
                  <Input
                    type="number"
                    step={field.key.includes('price') || field.key.includes('discount') || field.key.includes('reward') ? '0.01' : '1'}
                    value={changes[field.key] ?? pricing[field.key]}
                    onChange={(e) => handleFieldChange(field.key, parseFloat(e.target.value))}
                    className="pl-8"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Last Updated:</strong> {pricing.updated_at ? new Date(pricing.updated_at).toLocaleDateString() : 'Never'} by {pricing.updated_by || 'System'}
            </p>
          </div>

          <Button
            onClick={handleSaveChanges}
            disabled={Object.keys(changes).length === 0 || loading}
            className="w-full bg-blue-600 hover:bg-blue-700 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Changes
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {showHistory && (
        <Card>
          <CardHeader>
            <CardTitle>Pricing History</CardTitle>
          </CardHeader>
          <CardContent>
            {history.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No history available</p>
            ) : (
              <div className="space-y-3">
                {history.slice(0, 10).map((entry) => (
                  <div key={entry.id} className="border-l-4 border-blue-400 pl-4 py-2">
                    <p className="font-semibold text-sm">
                      {new Date(entry.changed_at).toLocaleDateString()} - Changed by {entry.changed_by}
                    </p>
                    {entry.change_reason && (
                      <p className="text-sm text-gray-600 mt-1">{entry.change_reason}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {showReasonDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Change Reason</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="reason">Why are you making these changes? (Optional)</Label>
                <textarea
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g., Q2 promotion, competitor adjustment, etc."
                  className="w-full mt-2 p-2 border rounded-md text-sm"
                  rows="3"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowReasonDialog(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={confirmSave}
                  className="flex-1 bg-blue-600"
                >
                  Confirm
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default PricingManagement;
