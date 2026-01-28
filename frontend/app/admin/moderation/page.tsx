'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BACKEND_URL } from '@/lib/config';

interface PendingItem {
  _id: string;
  title: string;
  description: string;
  category: string;
  type: 'lost' | 'found';
  reportedBy: string;
  reportedAt: string;
  images: string[];
  status: 'pending' | 'approved' | 'rejected';
}

export default function ModerationPage() {
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);
  const [flaggedItems, setFlaggedItems] = useState<PendingItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPendingItems();
    fetchFlaggedItems();
  }, []);

  const fetchPendingItems = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/api/admin/pending-items`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      setPendingItems(data.items || []);
    } catch (error) {
      console.error('Failed to fetch pending items:', error);
    }
  };

  const fetchFlaggedItems = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/api/admin/flagged-items`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      setFlaggedItems(data.items || []);
    } catch (error) {
      console.error('Failed to fetch flagged items:', error);
    } finally {
      setLoading(false);
    }
  };

  const moderateItem = async (itemId: string, action: 'approve' | 'reject') => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`${BACKEND_URL}/api/admin/moderate-item/${itemId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ action })
      });
      fetchPendingItems();
      fetchFlaggedItems();
    } catch (error) {
      console.error('Failed to moderate item:', error);
    }
  };

  if (loading) return <div className="p-6">Loading moderation queue...</div>;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Content Moderation</h1>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList>
          <TabsTrigger value="pending">
            Pending Approval ({pendingItems.length})
          </TabsTrigger>
          <TabsTrigger value="flagged">
            Flagged Content ({flaggedItems.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {pendingItems.map((item) => (
            <Card key={item._id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{item.title}</CardTitle>
                    <div className="flex gap-2 mt-2">
                      <Badge variant={item.type === 'lost' ? 'destructive' : 'default'}>
                        {item.type.toUpperCase()}
                      </Badge>
                      <Badge variant="outline">{item.category}</Badge>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => moderateItem(item._id, 'approve')}
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => moderateItem(item._id, 'reject')}
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-2">{item.description}</p>
                <p className="text-xs text-gray-500">
                  Reported by: {item.reportedBy} | {new Date(item.reportedAt).toLocaleString()}
                </p>
                {item.images.length > 0 && (
                  <div className="flex gap-2 mt-2">
                    {item.images.slice(0, 3).map((image, index) => (
                      <img
                        key={index}
                        src={image}
                        alt="Item"
                        className="w-16 h-16 object-cover rounded"
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
          {pendingItems.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center text-gray-500">
                No items pending approval
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="flagged" className="space-y-4">
          {flaggedItems.map((item) => (
            <Card key={item._id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{item.title}</CardTitle>
                    <div className="flex gap-2 mt-2">
                      <Badge variant="destructive">FLAGGED</Badge>
                      <Badge variant="outline">{item.category}</Badge>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => moderateItem(item._id, 'approve')}
                    >
                      Clear Flag
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => moderateItem(item._id, 'reject')}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-2">{item.description}</p>
                <p className="text-xs text-gray-500">
                  Reported by: {item.reportedBy} | {new Date(item.reportedAt).toLocaleString()}
                </p>
              </CardContent>
            </Card>
          ))}
          {flaggedItems.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center text-gray-500">
                No flagged content
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}