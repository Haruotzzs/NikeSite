import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Card from "../card/Card.jsx";
import { backendUrl } from "../../Context.jsx";

/**
 * SearchPage Component
 * Extracts search queries from the URL and fetches matching products from the backend.
 */
function SearchPage() {
  // --- URL QUERY HANDLING ---
  // searchParams allows us to access the '?q=xyz' part of the URL
  const [searchParams] = useSearchParams();
  const query = searchParams.get("q");

  // --- STATE MANAGEMENT ---
  const [results, setResults] = useState([]);        // Stores the array of found products
  const [isSearching, setIsSearching] = useState(false); // Controls the "Searching..." loading state

  useEffect(() => {
    // Only perform the fetch if a query exists in the URL
    if (query) {
      setIsSearching(true);

      // --- API FETCH LOGIC ---
      // encodeURIComponent ensures special characters in the search string don't break the URL
      fetch(`${backendUrl}/products?q=${encodeURIComponent(query)}`)
        .then((res) => res.json())
        .then((data) => {
          setResults(data);
          setIsSearching(false);
        })
        .catch((err) => {
          // Log network errors or server failures
          console.error("Search fetch error:", err);
          setIsSearching(false);
        });
    } else {
      // Clear results if the search input is empty
      setResults([]);
    }
    
    // Re-run this effect every time the query in the URL changes
  }, [query]);

  // --- UI RENDER: LOADING STATE ---
  if (isSearching) {
    return (
      <div style={{ textAlign: "center", padding: "50px" }}>
        Searching...
      </div>
    );
  }

  return (
    <div>
      {/* Search Header */}
      <h2 style={{ display: "flex", justifyContent: "center", padding: "20px" }}>
        Search Results for "{query}"
      </h2>

      {/* --- RESULTS GRID --- */}
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", minHeight: "50vh" }}>
        
        {results.length > 0 ? (
          /* Pass the array of products to your existing Card component */
          <Card items={results} />
        ) : (
          /* --- EMPTY STATE --- */
          // Only show "No results" if there was an actual query attempted
          query && <h2 style={{ marginTop: "50px" }}>No results found for "{query}"</h2>
        )}
      </div>
    </div>
  );
}

export default SearchPage;