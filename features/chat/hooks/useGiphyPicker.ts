import { useState, useEffect, useRef } from "react";

const GIPHY_API_KEY = process.env.NEXT_PUBLIC_GIPHY_API_KEY || "";

type GiphyType = "gifs" | "stickers";

export function useGiphyPicker(type: GiphyType) {
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchItems = async (query: string) => {
    setLoading(true);
    setError(null);
    try {
      const endpoint = query
        ? `https://api.giphy.com/v1/${type}/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(query)}&limit=20&rating=g`
        : `https://api.giphy.com/v1/${type}/trending?api_key=${GIPHY_API_KEY}&limit=20&rating=g`;

      const res = await fetch(endpoint);
      if (!res.ok) throw new Error(`Status: ${res.status}`);

      const data = await res.json();
      setItems(data.data || []);
      if (!data.data || data.data.length === 0) {
        setError(`No ${type === "gifs" ? "GIFs" : "stickers"} found for this search.`);
      }
    } catch (error: any) {
      console.error(`Error fetching ${type}:`, error);
      setError(`Failed to load ${type === "gifs" ? "GIFs" : "stickers"}. Please check your connection.`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchItems(search);
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [search]);

  return {
    search,
    setSearch,
    items,
    loading,
    error,
    scrollRef,
  };
}
