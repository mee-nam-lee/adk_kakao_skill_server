import React, { useState, useRef, useEffect } from 'react';
import { Plus, Gift, ChevronLeft, ChevronRight, Send, Search, X, MessageSquare } from 'lucide-react';

// Product Card Component
const ProductCard = ({ name, price, currency, stockInfo, imageUrl, category, productUrl }) => {
  return (
    <div className="bg-white rounded-xl shadow-lg p-4 w-72 md:w-80 flex-shrink-0 flex flex-col hover:shadow-xl transition-shadow duration-300">
      <div className="w-full h-52 bg-gray-100 rounded-lg mb-4 flex items-center justify-center overflow-hidden">
        {imageUrl && imageUrl !== "https://shop.googlemerchandisestore.com/store/20160512512/assets/items/images/noimage.jpg" ? (
          <img src={imageUrl} alt={name} className="w-full h-full object-cover" onError={(e) => { e.target.onerror = null; e.target.src="https://placehold.co/300x300/E8E8E8/B0B0B0?text=No+Image&font=sans-serif"; }}/>
        ) : (
           <img src="https://placehold.co/300x300/E8E8E8/B0B0B0?text=No+Image&font=sans-serif" alt={name} className="w-full h-full object-cover" />
        )}
      </div>
      <div className="flex items-center text-sm text-purple-600 mb-1">
        <Gift size={16} className="mr-2" />
        <span>{category || "Category"}</span>
      </div>
      <h3 className="text-lg font-semibold text-gray-800 mb-1 truncate h-7" title={name}>{name}</h3>
      <div className="mt-auto">
        <p className="text-xl font-bold text-purple-700 mb-1">
          {price} <span className="text-sm font-normal">{currency}</span>
        </p>
        <p className={`text-xs mb-3 h-4 ${stockInfo.startsWith("In stock") ? 'text-green-600' : 'text-red-500'}`}>{stockInfo}</p>
        <a
          href={productUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full text-center bg-fuchsia-200 hover:bg-fuchsia-300 text-purple-700 font-medium py-2.5 px-4 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-purple-400"
        >
          View Product &gt;
        </a>
      </div>
    </div>
  );
};

// API 응답 상품 데이터를 ProductCard props 형식으로 변환하는 헬퍼 함수
const formatApiProducts = (apiProductItems) => {
  if (!Array.isArray(apiProductItems)) {
    console.warn("formatApiProducts: input is not an array", apiProductItems);
    return [];
  }
  return apiProductItems.map(item => {
    const [priceValue, currencyValue] = item.price ? item.price.split(" ") : ["N/A", ""];
    return {
      id: item.id,
      name: item.title,
      price: priceValue,
      currency: currencyValue,
      stockInfo: item.availability > 0 ? `In stock (${item.availability})` : "Out of stock",
      imageUrl: item.image,
      category: item.categories, // API 응답에 categories 필드 사용
      productUrl: item.url,
      availability: item.availability
    };
  });
};


// Main Agent UI Component
const AgentUI = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [chatMessages, setChatMessages] = useState([]);
  // const [allProducts, setAllProducts] = useState([]); // 전체 상품 목록은 이제 API 검색 결과로 대체될 수 있음
  const [searchResults, setSearchResults] = useState([]); 
  const [showSearchResultsSection, setShowSearchResultsSection] = useState(false); 
  
  const [sessionId, setSessionId] = useState(null);
  const [userName, setUserName] = useState("user_123"); 

  const scrollContainerRef = useRef(null);
  const chatContainerRef = useRef(null);

  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:8080"; 

  // newProductData는 이제 API 호출로 대체되므로 주석 처리하거나 제거 가능
  // const newProductData = { items: [ /* ... */ ] };

  const createNewSession = async (currentSessionId, currentUserName) => {
    if (!currentSessionId || !currentUserName) {
        console.error("createNewSession: Session ID or User Name is missing.");
        return; 
    }
    const apiUrl = `${API_BASE_URL}/apps/catalog_agent/users/${currentUserName}/sessions/${currentSessionId}`;
    console.log(`Creating new session: POST ${apiUrl}`); 
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (response.ok) {
        const responseText = await response.text();
        try { const jsonData = JSON.parse(responseText); console.log('New session created successfully:', jsonData); } 
        catch (e) { console.log('New session POST successful. Response (not JSON or empty):', responseText || "Empty response"); }
      } else { 
        const errorText = await response.text(); 
        console.error('Failed to create new session. Status:', response.status, 'Response:', errorText);
      }
    } catch (error) { console.error('Error during createNewSession API call:', error); }
  };
  
  const searchCatalog = async (userInput, currentSessionId, currentUserName) => {
    if (!userInput || !currentSessionId || !currentUserName) {
      console.error("searchCatalog: User input, Session ID, or User Name is missing.");
      setChatMessages(prevMessages => [...prevMessages, { type: 'bot', text: "Sorry, there was an error with my internal system. Please try again." }]);
      return;
    }
    const apiUrl = `${API_BASE_URL}/run`;
    const requestBody = {
      app_name: "catalog_agent",
      user_id: currentUserName,
      session_id: currentSessionId,
      new_message: {
        role: "user",
        parts: [{ text: userInput }]
      },
      streaming: false
    };
    console.log(`Searching catalog: POST ${apiUrl}`, requestBody);
    setChatMessages(prevMessages => [...prevMessages, { type: 'bot', text: `Searching for "${userInput}"...` }]);
    setShowSearchResultsSection(false); // 이전 검색 결과 숨기기
    setSearchResults([]); // 이전 검색 결과 초기화

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      if (response.ok) {
        const apiResponseArray = await response.json(); // API 응답은 배열 형태
        console.log('Search catalog response (raw array):', apiResponseArray);

        let productsFound = [];

        if (Array.isArray(apiResponseArray)) {
          apiResponseArray.forEach(responseItem => {
            if (responseItem.content && Array.isArray(responseItem.content.parts)) {
              responseItem.content.parts.forEach(part => {
                if (part.functionResponse && part.functionResponse.name === "call_catalog_search") { //
                  try {
                    const resultJson = JSON.parse(part.functionResponse.response.result); //
                    if (resultJson && Array.isArray(resultJson.items)) {
                      productsFound = formatApiProducts(resultJson.items); //
                      console.log("Formatted products from API:", productsFound);
                    }
                  } catch (e) {
                    console.error("Failed to parse functionResponse result JSON:", e);
                  }
                }
              });
            }
          });
        }
        

        
        if (productsFound.length > 0) {
          setSearchResults(productsFound);
          setShowSearchResultsSection(true);
        }

      } else {
        const errorData = await response.json().catch(() => ({ message: "Failed to parse error response from search" }));
        console.error('Failed to search catalog:', response.status, errorData);
        setChatMessages(prevMessages => [...prevMessages, { type: 'bot', text: `Sorry, I encountered an error while searching: ${errorData.message || response.statusText}` }]);
      }
    } catch (error) {
      console.error('Error during searchCatalog API call:', error);
      setChatMessages(prevMessages => [...prevMessages, { type: 'bot', text: `Sorry, a network error occurred: ${error.message}` }]);
    }
  };

  useEffect(() => {
    const initialSessionId = crypto.randomUUID(); 
    setSessionId(initialSessionId); 
    if (userName) { 
        createNewSession(initialSessionId, userName); 
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userName]); 

  // 상품 데이터 초기화 로직은 API 호출로 대체되었으므로 주석 처리 또는 제거
  // useEffect(() => {
  //   const formattedProducts = newProductData.items.map(item => { /* ... */ });
  //   setAllProducts(formattedProducts);
  // }, []);

 useEffect(() => {
    if (chatContainerRef.current) { chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight; }
  }, [chatMessages]);

  const scroll = (direction) => {
    if (scrollContainerRef.current) {
      const scrollAmount = 300; 
      scrollContainerRef.current.scrollBy({ left: direction === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
    }
  };

  const handleSearchChange = (event) => { setSearchTerm(event.target.value); };
  const clearSearch = () => { setSearchTerm(""); };

  const handleSubmitSearch = async (event) => {
    event.preventDefault();
    const trimmedUserInput = searchTerm.trim();
    if (trimmedUserInput) {
      setChatMessages(prevMessages => [...prevMessages, { type: 'user', text: trimmedUserInput }]);
      setSearchTerm("");
      
      await searchCatalog(trimmedUserInput, sessionId, userName);
      // 클라이언트 측 필터링 로직 제거, API 응답으로 searchResults가 채워짐
    }
  };
  
  const handleNewConversation = () => {
    setChatMessages([]);
    setSearchTerm("");
    setSearchResults([]);
    setShowSearchResultsSection(false);
    const newSessionId = crypto.randomUUID();
    setSessionId(newSessionId);
    if (userName) { 
        createNewSession(newSessionId, userName); 
    }
  };

  const availableSearchResultsCount = searchResults.filter(p => p.availability > 0).length;
  let searchResultsInfoText = "";
  if (showSearchResultsSection && searchResults.length > 0) { 
    searchResultsInfoText = `Found ${searchResults.length} product(s) matching your search.`;
    const outOfStockCount = searchResults.length - availableSearchResultsCount;
    if (availableSearchResultsCount === searchResults.length) { searchResultsInfoText += " (All in stock)"; } 
    else if (availableSearchResultsCount === 0) { searchResultsInfoText += " (All out of stock)"; } 
    else { searchResultsInfoText += ` (${availableSearchResultsCount} in stock, ${outOfStockCount} out of stock)`; }
  }

  return (
    <div className="flex flex-col h-screen bg-purple-50 font-sans antialiased">
      <header className="bg-purple-600 text-white p-4 flex justify-between items-center shadow-md flex-shrink-0 sticky top-0 z-20">
        <div className="flex flex-col"> <h1 className="text-xl font-semibold">Product Catalog Agent</h1> </div>
        <button onClick={handleNewConversation} className="flex items-center bg-purple-500 hover:bg-purple-400 text-white font-medium py-2 px-3 sm:px-4 rounded-lg transition-colors text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-purple-300">
          <Plus size={20} className="mr-1 sm:mr-2" /> New Conversation
        </button>
      </header>

      <main ref={chatContainerRef} className="flex-grow p-4 md:p-6 overflow-y-auto">
        {chatMessages.length === 0 && !showSearchResultsSection && (
            <div className="bg-fuchsia-100 text-gray-700 p-4 rounded-lg mb-6 shadow flex items-start">
                <MessageSquare size={24} className="text-purple-600 mr-3 flex-shrink-0 mt-1" />
                <p> Please enter what you are looking for in the product catalog. </p>
            </div>
        )}
        <div className="space-y-4 mb-6">
          {chatMessages.map((msg, index) => (
            <div key={index} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-xl p-3 rounded-lg shadow ${ msg.type === 'user' ? 'bg-purple-500 text-white' : 'bg-white text-gray-700' }`}>
                {/* 봇 메시지가 Markdown 테이블일 경우, 스타일링이 필요할 수 있습니다. 여기서는 텍스트로만 표시됩니다. */}
                <div dangerouslySetInnerHTML={{ __html: msg.text.replace(/\n/g, '<br />') }} />
              </div>
            </div>
          ))}
        </div>
        {showSearchResultsSection && searchResults.length > 0 && (
          <div className="relative mb-6">
            <h2 className="text-2xl font-semibold text-gray-700 mb-1 ml-1">Search Results</h2>
            {searchResultsInfoText && ( <p className="text-sm text-gray-500 mb-4 ml-1">{searchResultsInfoText}</p> )}
            <div className="flex items-center"> 
                <button title="Previous Product" onClick={() => scroll('left')} className="absolute left-0 top-1/2 transform -translate-y-1/2 z-10 p-2 ml-[-10px] md:ml-[-15px] rounded-full bg-white/80 hover:bg-white text-purple-600 shadow-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-400" style={{ marginTop: '2.5rem' }} > <ChevronLeft size={28} /> </button>
                <div ref={scrollContainerRef} className="flex items-stretch space-x-4 overflow-x-auto pb-4 pt-2 scrollbar-hide">
                    {searchResults.map((product) => ( 
                      <ProductCard key={product.id} name={product.name} price={product.price} currency={product.currency} stockInfo={product.stockInfo} imageUrl={product.imageUrl} category={product.category} productUrl={product.productUrl} />
                    ))}
                    <div className="flex-shrink-0 w-1"></div> 
                </div>
                <button title="Next Product" onClick={() => scroll('right')} className="absolute right-0 top-1/2 transform -translate-y-1/2 z-10 p-2 mr-[-10px] md:mr-[-15px] rounded-full bg-white/80 hover:bg-white text-purple-600 shadow-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-400" style={{ marginTop: '2.5rem' }} > <ChevronRight size={28} /> </button>
            </div>
          </div>
        )}
      </main>

      <footer className="bg-white p-3 border-t border-gray-200 flex-shrink-0 sticky bottom-0 z-20">
        <form onSubmit={handleSubmitSearch} className="flex items-center bg-fuchsia-100 rounded-lg p-1 shadow-sm focus-within:ring-2 focus-within:ring-purple-400 transition-shadow">
          <Search size={20} className="text-gray-500 mx-3" />
          <input type="text" value={searchTerm} onChange={handleSearchChange} placeholder="Search product catalog" className="flex-grow p-3 bg-transparent text-gray-700 placeholder-gray-500 focus:outline-none" />
          {searchTerm && ( <button type="button" onClick={clearSearch} className="text-gray-500 hover:text-gray-700 p-2 mr-1 rounded-full" title="Clear search" > <X size={20} /> </button> )}
          <button type="submit" title="Search" className="bg-purple-600 hover:bg-purple-700 text-white p-3 rounded-lg ml-2 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-purple-400 disabled:opacity-50" disabled={!searchTerm.trim()} > <Send size={20} /> </button>
        </form>
      </footer>
    </div>
  );
};

export default AgentUI;
