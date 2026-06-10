import React from "react";
import {
  useProductAlerts,
  useCreateAlert,
  useUpdateAlert,
  useDeleteAlert,
} from "../hooks/useAlerts";

interface AlertModalProps {
  productId: string;
  productTitle: string;
  onClose: () => void;
}

export function AlertModal({ productId, productTitle, onClose }: AlertModalProps) {
  const { data: alerts = [], isLoading } = useProductAlerts(productId);
  const createAlertMutation = useCreateAlert();
  const updateAlertMutation = useUpdateAlert(productId);
  const deleteAlertMutation = useDeleteAlert(productId);

  const [targetPrice, setTargetPrice] = React.useState("");
  const [channel, setChannel] = React.useState<"TELEGRAM" | "DISCORD" | "EMAIL">("TELEGRAM");
  const [cooldown, setCooldown] = React.useState("24");
  const [errorMessage, setErrorMessage] = React.useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    const parsedPrice = parseFloat(targetPrice);
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      setErrorMessage("Please enter a valid target price greater than 0.");
      return;
    }

    try {
      await createAlertMutation.mutateAsync({
        productId,
        targetPrice: parsedPrice,
        notificationChannel: channel,
        cooldownHours: parseInt(cooldown, 10) || 24,
      });
      setTargetPrice("");
    } catch (err: any) {
      if (err.response?.status === 409) {
        setErrorMessage("An identical alert trigger already exists on this channel.");
      } else {
        setErrorMessage("Failed to create alert configuration. Please try again.");
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-xl overflow-hidden border border-gray-100 dark:border-gray-800">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Configure Price Alerts</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-6">
          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
            Product: <span className="text-gray-700 dark:text-gray-200">{productTitle}</span>
          </p>

          {/* Form: Add Alert */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">Add New Alert Rule</h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Target Price (₹)</label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 79999"
                  value={targetPrice}
                  onChange={(e) => setTargetPrice(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-800 px-3 py-2 text-sm bg-white dark:bg-gray-950 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Channel</label>
                <select
                  value={channel}
                  onChange={(e) => setChannel(e.target.value as any)}
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-800 px-3 py-2 text-sm bg-white dark:bg-gray-950 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="TELEGRAM">Telegram</option>
                  <option value="DISCORD">Discord</option>
                  <option value="EMAIL">Email SMTP</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Quiet Window (hrs)</label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 24"
                  value={cooldown}
                  onChange={(e) => setCooldown(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-800 px-3 py-2 text-sm bg-white dark:bg-gray-950 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {errorMessage && (
              <p className="text-xs text-red-500 font-semibold">{errorMessage}</p>
            )}

            <button
              type="submit"
              disabled={createAlertMutation.isPending}
              className="w-full rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-2 text-sm transition-colors shadow-md"
            >
              {createAlertMutation.isPending ? "Creating Rule..." : "Register Alert Rule"}
            </button>
          </form>

          <hr className="border-gray-100 dark:border-gray-800/80" />

          {/* List: Existing Alerts */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">Active Triggers</h4>

            {isLoading ? (
              <p className="text-xs text-gray-400">Loading alert records...</p>
            ) : alerts.length === 0 ? (
              <p className="text-xs text-gray-400">No alert rules configured for this product.</p>
            ) : (
              <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                {alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800/30 border border-gray-100 dark:border-gray-800/60"
                  >
                    <div>
                      <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 mr-2">
                        {alert.notificationChannel}
                      </span>
                      <span className="text-sm font-bold text-gray-800 dark:text-gray-200">
                        ₹{Number(alert.targetPrice).toLocaleString("en-IN")}
                      </span>
                      <span className="text-[10px] text-gray-400 ml-2 block sm:inline">
                        (Quiet: {alert.cooldownHours}h)
                      </span>
                    </div>

                    <div className="flex items-center space-x-3">
                      {/* Active Toggle */}
                      <button
                        onClick={() =>
                          updateAlertMutation.mutate({
                            id: alert.id,
                            isActive: !alert.isActive,
                          })
                        }
                        className={`text-xs px-2 py-1 rounded font-semibold transition-colors ${
                          alert.isActive
                            ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400"
                            : "bg-gray-100 dark:bg-gray-800 text-gray-500"
                        }`}
                      >
                        {alert.isActive ? "Active" : "Paused"}
                      </button>

                      {/* Delete Trigger Button */}
                      <button
                        onClick={() => deleteAlertMutation.mutate(alert.id)}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                        title="Delete Alert Rule"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
