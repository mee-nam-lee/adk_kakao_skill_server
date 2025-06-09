import React, { useState, useRef, useEffect } from 'react';
import ReactDOMServer from 'react-dom/server';
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

// Format API products helper function
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

// Helper function to detect Model Armor blocking
const detectModelArmorBlocking = (apiResponseArray) => {
  console.log("Analyzing API response for Model Armor blocking:", apiResponseArray);

  if (!Array.isArray(apiResponseArray)) {
    return { isBlocked: false, reason: "Invalid response format" };
  }

  // Check for Model Armor safety blocking patterns
  for (const responseItem of apiResponseArray) {
    if (responseItem.content && Array.isArray(responseItem.content.parts)) {
      for (const part of responseItem.content.parts) {
        // Check for text responses that indicate blocking
        if (part.text) {
          const text = part.text.toLowerCase();

          // Model Armor callback blocking patterns
          const blockingPatterns = [
            "sorry, the catalog search service is not available for this request due to safety policies",
            "blocked by safety",
            "safety policies",
            "modify your request and try again",
            "prompt blocked",
            "blocked by model armor",
            "not available for this request due to safety"
          ];

          const isBlocked = blockingPatterns.some(pattern => text.includes(pattern));

          if (isBlocked) {
            console.log("Model Armor blocking detected in text:", part.text);
            return {
              isBlocked: true,
              reason: "Safety policy violation",
              message: part.text
            };
          }
        }
      }
    }
  }

  return { isBlocked: false, reason: "No blocking detected" };
};

// Helper function to convert basic markdown to HTML
const markdownToHtml = (text = "") => {
    if (!text) return "";

    // Handle bold first across the entire text
    const boldedText = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Split into paragraphs based on one or more empty lines
    const paragraphs = boldedText.split(/\n\s*\n/);

    const html = paragraphs.map(paragraph => {
        // Trim whitespace from the paragraph
        const trimmedParagraph = paragraph.trim();
        if (!trimmedParagraph) return "";

        const lines = trimmedParagraph.split('\n');
        // Check if all non-empty lines in the paragraph are list items
        const isList = lines.every(line => line.trim().startsWith('*'));

        if (isList) {
            const listItems = lines
                .map(line => `<li>${line.trim().substring(1).trim()}</li>`)
                .join('');
            return `<ul>${listItems}</ul>`;
        } else {
            // It's a regular paragraph, replace single newlines with <br />
            return `<p>${trimmedParagraph.replace(/\n/g, '<br />')}</p>`;
        }
    }).join('');

    return html;
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
        try {
          const jsonData = JSON.parse(responseText);
          console.log('New session created successfully:', jsonData);
        } catch (e) {
          console.log('New session POST successful. Response (not JSON or empty):', responseText || "Empty response");
        }
      } else {
        const errorText = await response.text();
        console.error('Failed to create new session. Status:', response.status, 'Response:', errorText);
      }
    } catch (error) {
      console.error('Error during createNewSession API call:', error);
    }
  };

  const searchCatalog = async (userInput, currentSessionId, currentUserName) => {
    if (!userInput || !currentSessionId || !currentUserName) {
      console.error("searchCatalog: User input, Session ID, or User Name is missing.");
      setChatMessages(prevMessages => [...prevMessages, {
        type: 'bot',
        text: "Sorry, there was an error with my internal system. Please try again."
      }]);
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

    setChatMessages(prevMessages => [...prevMessages, {
      type: 'bot',
      text: `Searching for "${userInput}"...`
    }]);

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      if (response.ok) {
        const apiResponseArray = await response.json();
        console.log('Search catalog response (raw array):', apiResponseArray);

        // Check for Model Armor blocking first
        const blockingCheck = detectModelArmorBlocking(apiResponseArray);

        if (blockingCheck.isBlocked) {
          console.log("Model Armor blocking detected:", blockingCheck);

          setChatMessages(prevMessages => {
            const updatedMessages = [...prevMessages];
            const lastMessageIndex = updatedMessages.length - 1;

            if (lastMessageIndex >= 0 &&
                updatedMessages[lastMessageIndex].type === 'bot' &&
                updatedMessages[lastMessageIndex].text.startsWith("Searching for")) {
              updatedMessages[lastMessageIndex] = {
                type: 'bot',
                text: "🚫 Your search request cannot be processed due to safety policies. Please try a different search term."
              };
            } else {
              updatedMessages.push({
                type: 'bot',
                text: "🚫 Your search request cannot be processed due to safety policies. Please try a different search term."
              });
            }
            return updatedMessages;
          });
          return; // Exit early, don't process further
        }

        // Continue with normal product processing if not blocked
        let productsFound = [];
        let productQuestionAnswer = null;
        let hasFunctionResponse = false;
        let hasAnyFunctionCall = false;

        if (Array.isArray(apiResponseArray)) {
          apiResponseArray.forEach(responseItem => {
            if (responseItem.content && Array.isArray(responseItem.content.parts)) {
              responseItem.content.parts.forEach(part => {
                // Check for any function call
                if (part.functionCall) {
                  hasAnyFunctionCall = true;
                  console.log("Found function call:", part.functionCall);
                }

                // Process product question answers
                if (part.functionResponse && part.functionResponse.name === "product_question") {
                  if (part.functionResponse.response && typeof part.functionResponse.response.result === 'string') {
                    productQuestionAnswer = part.functionResponse.response.result;
                    console.log("Found product question answer:", productQuestionAnswer);
                  }
                }
                // Process catalog search results
                else if (part.functionResponse && part.functionResponse.name === "call_catalog_search") {
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
              });
            }
          });
        }

        console.log("Final state - hasFunctionResponse:", hasFunctionResponse, "hasAnyFunctionCall:", hasAnyFunctionCall, "productsFound:", productsFound.length, "productQuestionAnswer:", !!productQuestionAnswer);

        const newBotMessages = [];
        if (productQuestionAnswer) {
          // Priority 1: A direct answer to a question
          newBotMessages.push({ type: 'bot', text: productQuestionAnswer });
        } else if (productsFound.length > 0) {
          // Priority 2: Found products
          const availableCount = productsFound.filter(p => p.availability > 0).length;
          const outOfStockCount = productsFound.length - availableCount;
          let productsInfoText = `I found ${productsFound.length} product(s) for you.`;

          if (availableCount === productsFound.length) {
            productsInfoText += " All are in stock!";
          } else if (availableCount === 0) {
            productsInfoText += " Unfortunately, all are out of stock.";
          } else {
            productsInfoText += ` (${availableCount} in stock, ${outOfStockCount} out of stock).`;
          }

          newBotMessages.push({ type: 'bot', text: productsInfoText });

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

          newBotMessages.push({
            type: 'bot_products',
            text: productListContainerHtml
          });
        } else {
          // Priority 3: Fallback "not found" messages
          let fallbackText = "I searched the catalog but didn't find any matching products.";
          if (!hasFunctionResponse) {
             fallbackText = "Search completed, but no products were found or processed.";
          }
           newBotMessages.push({ type: 'bot', text: fallbackText });
        }

        // Update the chat state by replacing the "Searching..." message with the new content
        setChatMessages(prevMessages => {
            const updatedMessages = [...prevMessages];
            const lastMessageIndex = updatedMessages.length - 1;

            if (lastMessageIndex >= 0 &&
                updatedMessages[lastMessageIndex].type === 'bot' &&
                updatedMessages[lastMessageIndex].text.startsWith("Searching for")) {
              // Replace the "Searching..." message with the new one(s)
              updatedMessages.pop();
              return [...updatedMessages, ...newBotMessages];
            } else {
              // If "Searching..." isn't the last message, just add the new one(s)
              return [...prevMessages, ...newBotMessages];
            }
        });

      } else {
        const errorData = await response.json().catch(() => ({
          message: "Failed to parse error response from search"
        }));
        console.error('Failed to search catalog:', response.status, errorData);

        setChatMessages(prevMessages => {
          const updatedMessages = [...prevMessages];
          const lastMessageIndex = updatedMessages.length - 1;

          if (lastMessageIndex >= 0 &&
              updatedMessages[lastMessageIndex].type === 'bot' &&
              updatedMessages[lastMessageIndex].text.startsWith("Searching for")) {
            updatedMessages[lastMessageIndex] = {
              type: 'bot',
              text: `Sorry, I encountered an error: ${errorData.message || response.statusText}`
            };
          } else {
            updatedMessages.push({
              type: 'bot',
              text: `Sorry, I encountered an error: ${errorData.message || response.statusText}`
            });
          }
          return updatedMessages;
        });
      }
    } catch (error) {
      console.error('Error during searchCatalog API call:', error);

      setChatMessages(prevMessages => {
        const updatedMessages = [...prevMessages];
        const lastMessageIndex = updatedMessages.length - 1;

        if (lastMessageIndex >= 0 &&
            updatedMessages[lastMessageIndex].type === 'bot' &&
            updatedMessages[lastMessageIndex].text.startsWith("Searching for")) {
          updatedMessages[lastMessageIndex] = {
            type: 'bot',
            text: `Sorry, a network error occurred: ${error.message}`
          };
        } else {
          updatedMessages.push({
            type: 'bot',
            text: `Sorry, a network error occurred: ${error.message}`
          });
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
  }, [userName]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const handleSearchChange = (event) => { setSearchTerm(event.target.value); };
  const clearSearch = () => { setSearchTerm(""); };

  const handleSubmitSearch = async (event) => {
    event.preventDefault();
    const trimmedUserInput = searchTerm.trim();
    if (trimmedUserInput) {
      setChatMessages(prevMessages => [...prevMessages, {
        type: 'user',
        text: trimmedUserInput
      }]);
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

  const getMessageHtml = (msg) => {
    switch (msg.type) {
        case 'bot':
            // Convert markdown-like text to HTML for regular bot messages
            return markdownToHtml(msg.text);
        case 'bot_products':
            // This content is already HTML
            return msg.text;
        case 'user':
        default:
            // For user text, just replace newlines
            return msg.text.replace(/\n/g, '<br />');
    }
  }

  return (
    <div className="flex flex-col h-screen bg-purple-50 font-sans antialiased">
      <header className="bg-purple-600 text-white p-4 flex justify-between items-center shadow-md flex-shrink-0 sticky top-0 z-20">
        <div className="flex flex-col">
          <h1 className="text-xl font-semibold">Product Catalog Agent</h1>
        </div>
        <button
          onClick={handleNewConversation}
          className="flex items-center bg-purple-500 hover:bg-purple-400 text-white font-medium py-2 px-3 sm:px-4 rounded-lg transition-colors text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-purple-300"
        >
          <Plus size={20} className="mr-1 sm:mr-2" /> New Conversation
        </button>
      </header>

      <main ref={chatContainerRef} className="flex-grow p-4 md:p-6 overflow-y-auto">
        {chatMessages.length === 0 && (
          <div className="bg-fuchsia-100 text-gray-700 p-4 rounded-lg mb-6 shadow flex items-start">
            <MessageSquare size={24} className="text-purple-600 mr-3 flex-shrink-0 mt-1" />
            <p>Please enter what you are looking for in the product catalog.</p>
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
                <div dangerouslySetInnerHTML={{ __html: getMessageHtml(msg) }} />
              </div>
            </div>
          ))}
        </div>
      </main>

      <footer className="bg-white p-3 border-t border-gray-200 flex-shrink-0 sticky bottom-0 z-20">
        <form onSubmit={handleSubmitSearch} className="flex items-center bg-fuchsia-100 rounded-lg p-1 shadow-sm focus-within:ring-2 focus-within:ring-purple-400 transition-shadow">
          <Search size={20} className="text-gray-500 mx-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={handleSearchChange}
            placeholder="Search product catalog"
            className="flex-grow p-3 bg-transparent text-gray-700 placeholder-gray-500 focus:outline-none"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={clearSearch}
              className="text-gray-500 hover:text-gray-700 p-2 mr-1 rounded-full"
              title="Clear search"
            >
              <X size={20} />
            </button>
          )}
          <button
            type="submit"
            title="Search"
            className="bg-purple-600 hover:bg-purple-700 text-white p-3 rounded-lg ml-2 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-purple-400 disabled:opacity-50"
            disabled={!searchTerm.trim()}
          >
            <Send size={20} />
          </button>
        </form>
      </footer>
    </div>
  );
};

export default AgentUI;