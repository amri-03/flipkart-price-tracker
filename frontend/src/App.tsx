import React from "react";
import {
  useProducts,
  useTrackProduct,
  useRefreshProduct,
  useDeleteProduct,
  useProductHistory,
  type Product,
} from "./hooks/useProducts";
import { PriceChart } from "./components/PriceChart";
import { AlertModal } from "./components/AlertModal";

export default function App() {
  const { data: products = [], isLoading, error } = useProducts();
  const trackMutation = useTrackProduct();
  const refreshMutation = useRefreshProduct();
  const deleteMutation = useDeleteProduct();

  const [url, setUrl] = React.useState("");
  const [selectedProduct, setSelectedProduct] = React.useState<Product | null>(null);
  const [activeAlertProduct, setActiveAlertProduct] = React.useState<Product | null>(null);
  const [inputError, setInputError] = React.useState("");

  const handleTrackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setInputError("");

    if (!url.trim()) {
      setInputError("Please enter a valid product URL.");
      return;
    }

    try {
      await trackMutation.mutateAsync(url);
      setUrl("");
    } catch (err: any) {
      const msg = err.response?.data?.message || "Failed to parse product. Please verify the link is valid.";
      setInputError(msg);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/60 dark:bg-gray-950 text-gray-900 dark:text-white pb-12">
      
      {/* Central Header */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-800">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-xl">🏷️</span>
            <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-blue-600 to-indigo-500 bg-clip-text text-transparent">
              Flipkart Price Tracker
            </h1>
          </div>
          <span className="text-xs px-2 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-semibold border border-blue-100/40 dark:border-blue-800/40">
            Personal Dashboard
          </span>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 mt-8 space-y-8">
        
        {/* Tracking Input Card */}
        <section className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800/60 max-w-2xl mx-auto">
          <h2 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">Add Product to Track</h2>
          <form onSubmit={handleTrackSubmit} className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder="Paste Flipkart product link here..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="flex-1 rounded-xl border border-gray-200 dark:border-gray-800 px-4 py-2.5 text-sm bg-gray-50/50 dark:bg-gray-950 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={trackMutation.isPending}
              className="rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold px-6 py-2.5 text-sm transition-colors shadow-md shadow-blue-500/10 flex items-center justify-center space-x-2"
            >
              {trackMutation.isPending ? "Parsing Page..." : "Track Product"}
            </button>
          </form>
          {inputError && (
            <p className="mt-2.5 text-xs text-red-500 font-semibold">{inputError}</p>
          )}
        </section>

        {/* Dashboard Grid */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400">Tracked Items</h2>
            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Total: {products.length}</span>
          </div>

          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-sm text-gray-500">Loading your tracked listings...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-sm text-red-500">Could not connect to the backend server. Verify it is running.</p>
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-16 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-2xl bg-white dark:bg-gray-900/40">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">You are not tracking any products yet.</p>
              <p className="text-xs text-gray-400">Paste a link above to begin monitoring price drops.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((product) => (
                <div
                  key={product.id}
                  className={`group relative bg-white dark:bg-gray-900 rounded-2xl p-4 border transition-all ${
                    selectedProduct?.id === product.id
                      ? "border-blue-500 ring-2 ring-blue-500/10"
                      : "border-gray-100 dark:border-gray-800 hover:shadow-md hover:border-gray-200 dark:hover:border-gray-700"
                  }`}
                >
                  <div className="flex space-x-4">
                    {/* Thumbnail */}
                    <div className="w-20 h-20 bg-gray-50 dark:bg-gray-950 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center p-1 border border-gray-100 dark:border-gray-800">
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt={product.title}
                          className="max-w-full max-h-full object-contain"
                        />
                      ) : (
                        <span className="text-xs text-gray-400">No Img</span>
                      )}
                    </div>

                    {/* Meta details */}
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <h3
                        className="text-sm font-bold text-gray-900 dark:text-white truncate cursor-pointer hover:text-blue-600 transition-colors"
                        onClick={() => setSelectedProduct(product)}
                        title={product.title}
                      >
                        {product.title}
                      </h3>
                      <p className="text-[10px] text-gray-400 font-mono uppercase tracking-wider">
                        FSN: {product.platformId}
                      </p>
                      <div className="flex items-baseline space-x-2">
                        <span className="text-base font-extrabold text-gray-900 dark:text-white">
                          ₹{Number(product.currentPrice).toLocaleString("en-IN")}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="mt-4 pt-3 border-t border-gray-50 dark:border-gray-800/80 flex items-center justify-between">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setSelectedProduct(product)}
                        className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
                      >
                        Chart 📈
                      </button>
                      <button
                        onClick={() => setActiveAlertProduct(product)}
                        className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 transition-colors"
                      >
                        Alerts 🔔
                      </button>
                    </div>

                    <div className="flex space-x-2">
                      <button
                        onClick={() => refreshMutation.mutate(product.id)}
                        disabled={refreshMutation.isPending}
                        className="text-xs p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                        title="Force Check Pricing"
                      >
                        🔄
                      </button>
                      <button
                        onClick={() => deleteMutation.mutate(product.id)}
                        className="text-xs p-1 hover:bg-red-50 dark:hover:bg-red-950/30 text-gray-400 hover:text-red-500 rounded transition-colors"
                        title="Untrack Listing"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Selected Product History Panel */}
        {selectedProduct && <ProductHistoryPanel product={selectedProduct} onClose={() => setSelectedProduct(null)} />}

      </main>

      {/* Alert Overlay Modal */}
      {activeAlertProduct && (
        <AlertModal
          productId={activeAlertProduct.id}
          productTitle={activeAlertProduct.title}
          onClose={() => setActiveAlertProduct(null)}
        />
      )}
    </div>
  );
}

interface ProductHistoryPanelProps {
  product: Product;
  onClose: () => void;
}

function ProductHistoryPanel({ product, onClose }: ProductHistoryPanelProps) {
  const { data: history = [], isLoading } = useProductHistory(product.id);

  return (
    <section className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-bold text-gray-900 dark:text-white">Price History Chart</h2>
          <p className="text-xs text-gray-400 mt-1">{product.title}</p>
        </div>
        <button
          onClick={onClose}
          className="text-xs font-semibold px-2.5 py-1 rounded bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors"
        >
          Close Chart ✕
        </button>
      </div>

      {isLoading ? (
        <div className="h-64 flex items-center justify-center">
          <p className="text-xs text-gray-400">Loading historical data points...</p>
        </div>
      ) : (
        <PriceChart history={history} />
      )}
    </section>
  );
}
