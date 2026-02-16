import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Card from "../card/Card.jsx";

function SearchPage() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get("q");
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (query) {
      setIsSearching(true);
      fetch(`http://localhost:4200/products?q=${encodeURIComponent(query)}`)
        .then((res) => res.json())
        .then((data) => {
          setResults(data);
          setIsSearching(false);
        })
        .catch((err) => {
          console.error(err);
          setIsSearching(false);
        });
    } else {
      setResults([]);
    }
  }, [query]);

  // Якщо йде пошук — не рендеримо Card, щоб не було стрибків контенту
  if (isSearching) return <div style={{ textAlign: "center", padding: "50px" }}>Searching...</div>;

  return (
    <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", minHeight: "50vh" }}>
      {results.length > 0 ? (
        <Card items={results} />
      ) : (
        query && <h2 style={{ marginTop: "50px" }}>No results found for "{query}"</h2>
      )}
    </div>
  );
}

export default SearchPage;