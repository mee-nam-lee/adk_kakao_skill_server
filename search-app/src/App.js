import React, { useState, useRef, useEffect } from 'react';
import ReactDOMServer from 'react-dom/server'; // Import ReactDOMServer
import { Plus, Gift, Send, Search, X, MessageSquare } from 'lucide-react';

// Product Card Component (remains the same)
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
      category: item.categories, 
      productUrl: item.url,
      availability: item.availability
    };
  });
};


// Main Agent UI Component
const AgentUI = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [chatMessages, setChatMessages] = useState([]);
  
  const [sessionId, setSessionId] = useState(null);
  const userName = "user_123"; 

  const chatContainerRef = useRef(null); 

  const createNewSession = async (currentSessionId, currentUserName) => {
    if (!currentSessionId || !currentUserName) {
        console.error("createNewSession: Session ID or User Name is missing.");
        return; 
    }
    
    const apiUrl = `/apps/catalog_agent/users/${currentUserName}/sessions/${currentSessionId}`;
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
    
    const apiUrl = `/run`;
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

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      if (response.ok) {
        const apiResponseArray = await response.json(); 
        console.log('Search catalog response (raw array):', apiResponseArray);

        let productsFound = []; 
        let hasFunctionResponse = false; // functionResponse가 있었는지 여부 확인
        let isPromptBlocked = false; // 추가: prompt가 blocked되었는지 확인
        let hasAnyFunctionCall = false; // 어떤 function call이라도 있었는지 확인
        let botTextResponse = ""; // Agent의 텍스트 응답 저장

        if (Array.isArray(apiResponseArray)) {
          apiResponseArray.forEach(responseItem => {
            if (responseItem.content && Array.isArray(responseItem.content.parts)) {
              responseItem.content.parts.forEach(part => {
                // 모든 function call 확인
                if (part.functionCall) {
                  hasAnyFunctionCall = true;
                  console.log("Found function call:", part.functionCall);
                }
                // tool_prompt_checker의 결과 확인
                if (part.functionResponse && part.functionResponse.name === "tool_prompt_checker") {
                  console.log("Found tool_prompt_checker response:", part.functionResponse);
                  try {
                    let checkerResult;
                    // response.result가 이미 객체인지 문자열인지 확인
                    if (typeof part.functionResponse.response.result === 'string') {
                      checkerResult = JSON.parse(part.functionResponse.response.result);
                    } else {
                      checkerResult = part.functionResponse.response.result;
                    }
                    
                    console.log("Parsed checker result:", checkerResult);
                    
                    if (checkerResult && checkerResult.prompt_blocked_by_safety === true) {
                      isPromptBlocked = true;
                      console.log("Prompt blocked by Model Armor:", checkerResult);
                    }
                  } catch (e) {
                    console.error("Failed to parse tool_prompt_checker result:", e);
                    console.error("Raw result:", part.functionResponse.response.result);
                  }
                }              
                              
                if (part.functionResponse && part.functionResponse.name === "call_catalog_search") {
                  hasFunctionResponse = true;
                  try {
                    const resultJson = JSON.parse(part.functionResponse.response.result); 
                    if (resultJson && Array.isArray(resultJson.items)) {
                      productsFound = formatApiProducts(resultJson.items); 
                      console.log("Formatted products from API:", productsFound);
                    }
                  } catch (e) {
                    console.error("Failed to parse functionResponse result JSON:", e);
                  }
                } 

                // 텍스트 응답에서 Gemini 모델의 안전 필터 응답 감지
                if (part.text) {
                  botTextResponse = part.text;
                  console.log("Found text part:", part.text);
                  const safetyBlockedPhrases = [
                    "blocked",
                    "Prompt blocked",
                  ];
                  
                  const isBlocked = safetyBlockedPhrases.some(phrase => 
                    part.text.toLowerCase().includes(phrase.toLowerCase())
                  );
                  
                  if (isBlocked) {
                    isPromptBlocked = true;
                    console.log("Prompt blocked detected by Gemini safety filter in text response:", part.text);
                  }
                }           
                // part.text 처리 로직은 제거 (botResponseText 변수 삭제)
              });
            }
          });
        }  
        // 추가 로직: function call이 전혀 없고 텍스트 응답만 있으면 blocked로 간주
        // if (!hasAnyFunctionCall && botTextResponse && !isPromptBlocked) {
        //   console.log("No function calls detected, treating as potential safety block");
        //   isPromptBlocked = true;
        //}
      
        console.log("Final state - isPromptBlocked:", isPromptBlocked, "hasFunctionResponse:", hasFunctionResponse, "hasAnyFunctionCall:", hasAnyFunctionCall, "productsFound:", productsFound.length);
                     
        // "Searching for..." 메시지를 기본 응답으로 업데이트하거나, 상품 정보를 포함한 메시지로 업데이트
        setChatMessages(prevMessages => {
            const updatedMessages = [...prevMessages];
            const lastMessageIndex = updatedMessages.length - 1;
            if (lastMessageIndex >= 0 && updatedMessages[lastMessageIndex].type === 'bot' && updatedMessages[lastMessageIndex].text.startsWith("Searching for")) {
                // Prompt가 blocked된 경우
                if (isPromptBlocked) {
                  updatedMessages[lastMessageIndex] = { type: 'bot', text: "Your prompt has been blocked due to safety policies. Please try a different search query." };
                  return updatedMessages; // early return to prevent further processing
                }                                 
              // 상품이 없을 경우 기본 완료 메시지, 있거나 functionResponse가 있었으면 해당 메시지 유지 (아래에서 상품 정보 추가)
                if (!hasFunctionResponse && productsFound.length === 0) {
                     updatedMessages[lastMessageIndex] = { type: 'bot', text: "Search complete." };
                } else if (productsFound.length === 0 && hasFunctionResponse) { // functionResponse는 있었지만 상품은 0개
                     updatedMessages[lastMessageIndex] = { type: 'bot', text: "I looked for products based on your query." };
                } 
                // 상품이 있으면 "Searching for..." 메시지는 아래 상품 정보 메시지로 대체될 것임
            } else if (isPromptBlocked) {
              // "Searching for..." 메시지가 없는 경우에도 prompt blocked 메시지 추가
              updatedMessages.push({ type: 'bot', text: "Your prompt has been blocked due to safety policies. Please try a different search query." });
              return updatedMessages;
            } else if (!hasFunctionResponse && productsFound.length === 0) {
                updatedMessages.push({ type: 'bot', text: "Search complete." });
            }
            return updatedMessages;
        });
        
        if (productsFound.length > 0) {
          const availableCount = productsFound.filter(p => p.availability > 0).length;
          const outOfStockCount = productsFound.length - availableCount;
          let productsInfoText = `I found ${productsFound.length} product(s) for you.`;
          if (availableCount === productsFound.length) { productsInfoText += " All are in stock!"; }
          else if (availableCount === 0) { productsInfoText += " Unfortunately, all are out of stock."; }
          else { productsInfoText += ` (${availableCount} in stock, ${outOfStockCount} out of stock).`; }

          // "Searching for..." 메시지를 제품 정보 텍스트로 교체하거나 바로 뒤에 추가
            setChatMessages(prev => {
                const updatedMessages = [...prev];
                const lastMessageIndex = updatedMessages.length - 1;
                if (lastMessageIndex >=0 && updatedMessages[lastMessageIndex].type === 'bot' && 
                    (updatedMessages[lastMessageIndex].text.startsWith("Searching for") || updatedMessages[lastMessageIndex].text === "I looked for products based on your query.")) {
                    updatedMessages[lastMessageIndex] = { type: 'bot', text: productsInfoText };
                } else {
                    updatedMessages.push({ type: 'bot', text: productsInfoText });
                }
                return updatedMessages;
            });


          const productCardsHtml = productsFound.map(product => 
              ReactDOMServer.renderToString(
                  <ProductCard 
                      key={product.id} 
                      name={product.name}
                      price={product.price}
                      currency={product.currency}
                      stockInfo={product.stockInfo}
                      imageUrl={product.imageUrl}
                      category={product.category}
                      productUrl={product.productUrl}
                  />
              )
          ).join('');
          
          const productListContainerHtml = `
            <div class="flex overflow-x-auto space-x-4 py-3 scrollbar-thin scrollbar-thumb-purple-400 scrollbar-track-purple-100 rounded-lg">
              ${productCardsHtml}
            </div>`;
          
          setChatMessages(prev => [...prev, { type: 'bot_products', text: productListContainerHtml }]);
        } else if (hasFunctionResponse && productsFound.length === 0) { 
             // functionResponse는 있었지만 상품이 없는 경우 (위에서 "I looked for products..." 메시지로 이미 처리됨)
             // 추가 메시지가 필요하면 여기에 작성
        } else if (!hasFunctionResponse && productsFound.length === 0) {
            // functionResponse도 없고 상품도 없는 경우 (위에서 "Search complete." 메시지로 이미 처리됨)
            // 만약 "Sorry, I couldn't find..." 메시지를 명시적으로 추가하고 싶다면 여기에
        }


      } else {
        const errorData = await response.json().catch(() => ({ message: "Failed to parse error response from search" }));
        console.error('Failed to search catalog:', response.status, errorData);
        setChatMessages(prevMessages => { 
            const updatedMessages = [...prevMessages];
            const lastMessageIndex = updatedMessages.length - 1;
            if (lastMessageIndex >=0 && updatedMessages[lastMessageIndex].type === 'bot' && updatedMessages[lastMessageIndex].text.startsWith("Searching for")) {
                 updatedMessages[lastMessageIndex] = { type: 'bot', text: `Sorry, I encountered an error: ${errorData.message || response.statusText}` };
            } else {
                updatedMessages.push({ type: 'bot', text: `Sorry, I encountered an error: ${errorData.message || response.statusText}` });
            }
            return updatedMessages;
        });
      }
    } catch (error) {
      console.error('Error during searchCatalog API call:', error);
      setChatMessages(prevMessages => { 
            const updatedMessages = [...prevMessages];
            const lastMessageIndex = updatedMessages.length - 1;
            if (lastMessageIndex >=0 && updatedMessages[lastMessageIndex].type === 'bot' && updatedMessages[lastMessageIndex].text.startsWith("Searching for")) {
                 updatedMessages[lastMessageIndex] = { type: 'bot', text: `Sorry, a network error occurred: ${error.message}` };
            } else {
                updatedMessages.push({ type: 'bot', text: `Sorry, a network error occurred: ${error.message}` });
            }
            return updatedMessages;
        });
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

 useEffect(() => {
    if (chatContainerRef.current) { chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight; }
  }, [chatMessages]);

  const handleSearchChange = (event) => { setSearchTerm(event.target.value); };
  const clearSearch = () => { setSearchTerm(""); };

  const handleSubmitSearch = async (event) => {
    event.preventDefault();
    const trimmedUserInput = searchTerm.trim();
    if (trimmedUserInput) {
      setChatMessages(prevMessages => [...prevMessages, { type: 'user', text: trimmedUserInput }]);
      setSearchTerm("");
      await searchCatalog(trimmedUserInput, sessionId, userName);
    }
  };
  
  const handleNewConversation = () => {
    setChatMessages([]);
    setSearchTerm("");
    const newSessionId = crypto.randomUUID();
    setSessionId(newSessionId);
    if (userName) { 
        createNewSession(newSessionId, userName); 
    }
  };
  
  return (
    <div className="flex flex-col h-screen bg-purple-50 font-sans antialiased">
      <header className="bg-purple-600 text-white p-4 flex justify-between items-center shadow-md flex-shrink-0 sticky top-0 z-20">
        <div className="flex flex-col"> <h1 className="text-xl font-semibold">Product Catalog Agent</h1> </div>
        <button onClick={handleNewConversation} className="flex items-center bg-purple-500 hover:bg-purple-400 text-white font-medium py-2 px-3 sm:px-4 rounded-lg transition-colors text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-purple-300">
          <Plus size={20} className="mr-1 sm:mr-2" /> New Conversation
        </button>
      </header>

      <main ref={chatContainerRef} className="flex-grow p-4 md:p-6 overflow-y-auto">
        {chatMessages.length === 0 && ( 
            <div className="bg-fuchsia-100 text-gray-700 p-4 rounded-lg mb-6 shadow flex items-start">
                <MessageSquare size={24} className="text-purple-600 mr-3 flex-shrink-0 mt-1" />
                <p> Please enter what you are looking for in the product catalog. </p>
            </div>
        )}
        <div className="space-y-4 mb-6">
          {chatMessages.map((msg, index) => (
            <div key={index} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-full p-3 rounded-lg shadow ${ 
                msg.type === 'user' 
                  ? 'bg-purple-500 text-white ml-auto' 
                  : msg.type === 'bot_products' 
                    ? 'bg-transparent w-full' 
                    : 'bg-white text-gray-700 mr-auto' 
              }`}>
                <div dangerouslySetInnerHTML={{ __html: msg.text.replace(/\n/g, '<br />') }} />
              </div>
            </div>
          ))}
        </div>
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
