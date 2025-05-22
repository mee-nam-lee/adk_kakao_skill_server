import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Send, Gift, Zap, Search } from 'lucide-react';

// 제공된 새로운 데이터셋
const newProductData = {
  "items": [
    { "id": "GGOEGAEB164817", "title": "Google Black Eco Zip Hoodie", "categories": "Apparel", "price": "35.0 USD", "availability": 2, "url": "https://shop.googlemerchandisestore.com/Google+Redesign/Apparel/Google+Black+Eco+Zip+Hoodie", "image": "https://shop.googlemerchandisestore.com/store/20160512512/assets/items/images/noimage.jpg" },
    { "id": "GGOEGAEB164812", "title": "Google Black Eco Zip Hoodie", "categories": "Apparel", "price": "60.0 USD", "availability": 2, "url": "https://shop.googlemerchandisestore.com/Google+Redesign/Apparel/Google+Black+Eco+Zip+Hoodie", "image": "https://shop.googlemerchandisestore.com/store/20160512512/assets/items/images/noimage.jpg" },
    { "id": "GGOEGAEB164815", "title": "Google Black Eco Zip Hoodie", "categories": "Apparel", "price": "60.0 USD", "availability": 2, "url": "https://shop.googlemerchandisestore.com/Google+Redesign/Apparel/Google+Black+Eco+Zip+Hoodie", "image": "https://shop.googlemerchandisestore.com/store/20160512512/assets/items/images/noimage.jpg" },
    { "id": "GGOEGAEB164816", "title": "Google Black Eco Zip Hoodie", "categories": "Apparel", "price": "60.0 USD", "availability": 2, "url": "https://shop.googlemerchandisestore.com/Google+Redesign/Apparel/Google+Black+Eco+Zip+Hoodie", "image": "https://shop.googlemerchandisestore.com/store/20160512512/assets/items/images/noimage.jpg" },
    { "id": "GGOEGAEB164813", "title": "Google Black Eco Zip Hoodie", "categories": "Apparel", "price": "60.0 USD", "availability": 2, "url": "https://shop.googlemerchandisestore.com/Google+Redesign/Apparel/Google+Black+Eco+Zip+Hoodie", "image": "https://shop.googlemerchandisestore.com/store/20160512512/assets/items/images/noimage.jpg" },
    { "id": "GGOEGAEB164818", "title": "Google Black Eco Zip Hoodie", "categories": "Apparel", "price": "35.0 USD", "availability": 2, "url": "https://shop.googlemerchandisestore.com/Google+Redesign/Apparel/Google+Black+Eco+Zip+Hoodie", "image": "https://shop.googlemerchandisestore.com/store/20160512512/assets/items/images/noimage.jpg" },
    { "id": "GGOEGAEB164814", "title": "Google Black Eco Zip Hoodie", "categories": "Apparel", "price": "60.0 USD", "availability": 2, "url": "https://shop.googlemerchandisestore.com/Google+Redesign/Apparel/Google+Black+Eco+Zip+Hoodie", "image": "https://shop.googlemerchandisestore.com/store/20160512512/assets/items/images/noimage.jpg" },
    { "id": "GGOEGAXJ164914", "title": "Google Gray Toddler Zip Hoodie", "categories": "Apparel", "price": "50.0 USD", "availability": 1, "url": "https://shop.googlemerchandisestore.com/Google+Redesign/Apparel/Google+Gray+Toddler+Zip+Hoodie", "image": "https://shop.googlemerchandisestore.com/store/20160512512/assets/items/images/GGOEGXXX1649.jpg" },
    { "id": "GGOEGAXJ164913", "title": "Google Gray Toddler Zip Hoodie", "categories": "Apparel", "price": "35.0 USD", "availability": 1, "url": "https://shop.googlemerchandisestore.com/Google+Redesign/Apparel/Google+Gray+Toddler+Zip+Hoodie", "image": "https://shop.googlemerchandisestore.com/store/20160512512/assets/items/images/GGOEGXXX1649.jpg" },
    { "id": "GGOEGAXJ164915", "title": "Google Gray Toddler Zip Hoodie", "categories": "Apparel", "price": "50.0 USD", "availability": 1, "url": "https://shop.googlemerchandisestore.com/Google+Redesign/Apparel/Google+Gray+Toddler+Zip+Hoodie", "image": "https://shop.googlemerchandisestore.com/store/20160512512/assets/items/images/GGOEGXXX1649.jpg" }
  ]
};

// 새로운 데이터셋을 애플리케이션에서 사용할 형태로 변환
const initialProducts = newProductData.items.map(item => ({
  id: item.id,
  type: item.categories, 
  name: item.title,
  description: `${item.availability === 1 ? '한정 수량!' : '재고 있음'}`,
  detailsLink: item.url,
  image: item.image,
  icon: <Gift className="w-4 h-4 mr-1 text-purple-500" />, 
  price: item.price, 
}));


// 개별 상품 카드 컴포넌트
const ProductCard = ({ product }) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-4 flex-shrink-0 w-64 md:w-72 m-2 hover:shadow-lg transition-shadow duration-300 flex flex-col justify-between">
      <div>
        <img 
          src={product.image} 
          alt={product.name} 
          className="w-full h-40 object-contain rounded-md mb-3 bg-gray-100"
          onError={(e) => { 
            e.target.onerror = null; 
            e.target.src="https://placehold.co/300x200/E5E7EB/9CA3AF?text=Image+Not+Available&font=sans"; 
          }}
        />
        <div className="flex items-center text-xs text-gray-500 mb-1">
          {product.icon}
          <span>{product.type}</span>
        </div>
        <h3 className="text-base font-semibold text-gray-800 mb-1 h-12 overflow-hidden" title={product.name}>
            {product.name}
        </h3>
        <p className="text-sm font-bold text-purple-700 mb-1">{product.price}</p>
        <p className="text-xs text-gray-600 mb-3 h-8 overflow-hidden">{product.description}</p>
      </div>
      <a
        href={product.detailsLink}
        target="_blank" 
        rel="noopener noreferrer" 
        className="text-sm font-medium text-purple-600 hover:text-purple-800 transition-colors duration-300 mt-auto block text-center py-2 bg-purple-100 hover:bg-purple-200 rounded-md"
      >
        상품 보기 &gt;
      </a>
    </div>
  );
};

// 상품 캐러셀 컴포넌트
const ProductCarousel = ({ products }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [visibleProducts, setVisibleProducts] = useState(2);

  useEffect(() => {
    const updateVisibleProducts = () => {
      if (window.innerWidth < 768) {
        setVisibleProducts(1);
      } else if (window.innerWidth < 1024) {
        setVisibleProducts(2); 
      }
      else {
        setVisibleProducts(2); 
      }
    };
    updateVisibleProducts();
    window.addEventListener('resize', updateVisibleProducts);
    return () => window.removeEventListener('resize', updateVisibleProducts);
  }, []);

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev === 0 ? Math.max(0, products.length - visibleProducts) : prev - 1));
  };

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev >= products.length - visibleProducts ? 0 : prev + 1));
  };
  
  const disablePrev = currentIndex === 0;
  const disableNext = currentIndex >= Math.max(0, products.length - visibleProducts) || products.length <= visibleProducts;

  if (!products || products.length === 0) {
    return <div className="text-center py-4 text-gray-500">추천 상품이 없습니다.</div>;
  }
  
  return (
    <div className="relative w-full py-4">
      <div className="overflow-hidden">
        <div
          className="flex transition-transform duration-500 ease-in-out"
          style={{ transform: `translateX(-${currentIndex * (100 / visibleProducts)}%)` }} 
        >
          {products.map((product) => (
            <div key={product.id} style={{ flex: `0 0 ${100 / visibleProducts}%` }} className="px-1 flex-shrink-0">
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      </div>
      {products.length > visibleProducts && (
        <>
          <button
            onClick={prevSlide}
            disabled={disablePrev}
            className={`absolute top-1/2 left-0 transform -translate-y-1/2 -translate-x-4 bg-white p-2 rounded-full shadow-lg hover:bg-gray-100 transition-colors duration-300 z-10 ${disablePrev ? 'opacity-50 cursor-not-allowed' : ''}`}
            aria-label="이전 상품"
          >
            <ChevronLeft className="w-6 h-6 text-purple-600" />
          </button>
          <button
            onClick={nextSlide}
            disabled={disableNext}
            className={`absolute top-1/2 right-0 transform -translate-y-1/2 translate-x-4 bg-white p-2 rounded-full shadow-lg hover:bg-gray-100 transition-colors duration-300 z-10 ${disableNext ? 'opacity-50 cursor-not-allowed' : ''}`}
            aria-label="다음 상품"
          >
            <ChevronRight className="w-6 h-6 text-purple-600" />
          </button>
        </>
      )}
    </div>
  );
};

// 채팅 메시지 버블 컴포넌트
const ChatBubble = ({ children, isUser = false, onButtonClick, buttonText }) => {
  return (
    <div className={`flex mb-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-xs md:max-w-md lg:max-w-lg px-4 py-3 rounded-xl shadow ${isUser ? 'bg-purple-600 text-white rounded-br-none' : 'bg-purple-100 text-gray-800 rounded-bl-none'}`}>
        {children}
        {/* 추천 상품이 항상 표시되므로 버튼은 더 이상 필요하지 않을 수 있습니다. 
            필요에 따라 이 버튼 로직을 완전히 제거하거나 수정할 수 있습니다. */}
        {buttonText && onButtonClick && (
          <button
            onClick={onButtonClick}
            className="mt-2 block w-full text-left bg-purple-500 hover:bg-purple-700 text-white font-semibold py-2 px-3 rounded-lg transition-colors duration-300 text-sm"
          >
            {buttonText}
          </button>
        )}
      </div>
    </div>
  );
};

// 메시지 입력 컴포넌트
const MessageInput = ({ onSend }) => {
  const [message, setMessage] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (message.trim()) {
      onSend(message.trim());
      setMessage('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-3 bg-white border-t border-gray-200 sticky bottom-0">
      <div className="flex items-center bg-purple-50 rounded-lg p-1">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="검색어 입력"
          className="flex-grow p-2 bg-transparent text-gray-700 placeholder-gray-500 focus:outline-none"
          aria-label="검색어 입력창"
        />
        <button
          type="submit"
          className="p-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors duration-300 disabled:opacity-50"
          disabled={!message.trim()}
          aria-label="검색" 
        >
          <Send className="w-5 h-5" /> 
        </button>
      </div>
    </form>
  );
};

// 메인 앱 컴포넌트
export default function App() {
  const [currentProducts, setCurrentProducts] = useState(initialProducts); 
  // showProducts 상태를 true로 초기화하여 처음부터 상품 표시
  const [showProducts, setShowProducts] = useState(true); 
  const [messages, setMessages] = useState([
    { 
      id: 1, 
      // 초기 메시지 변경: 상품이 이미 표시됨을 알림
      text: "안녕하세요! 아래에서 추천 상품을 확인하시거나 검색어를 입력하여 제품을 찾아보세요. 😊", 
      isUser: false,
      // showButton: true, // 버튼을 더 이상 표시하지 않음
    }
  ]);

  // handleShowProducts 함수는 더 이상 초기 메시지 버튼에 의해 호출되지 않으므로,
  // 필요에 따라 다른 용도로 사용하거나 제거할 수 있습니다.
  // 여기서는 일단 유지하되, 초기 메시지에서는 호출되지 않도록 수정했습니다.
  const handleShowProducts = () => {
    setCurrentProducts(initialProducts); 
    setShowProducts(true);
    // 메시지에서 버튼을 제거했으므로, 이 부분은 더 이상 필요 없을 수 있습니다.
    // setMessages(prevMessages => 
    //   prevMessages.map(msg => msg.id === 1 ? { ...msg, showButton: false } : msg)
    // );
  };

  const handleSendMessage = (text) => {
    const searchTerm = text.toLowerCase();
    const newMessage = { id: Date.now(), text, isUser: true }; 
    setMessages(prevMessages => [...prevMessages, newMessage]);
    
    const filteredProducts = initialProducts.filter(product => 
      product.name.toLowerCase().includes(searchTerm) || 
      product.type.toLowerCase().includes(searchTerm)
    );
    setCurrentProducts(filteredProducts);
    setShowProducts(true); // 검색 시 항상 상품 표시

    // 초기 메시지의 버튼 관련 로직은 이미 제거되었으므로 이 부분은 영향 없음
    // setMessages(prevMessages => 
    //   prevMessages.map(msg => msg.id === 1 && msg.showButton ? { ...msg, showButton: false } : msg)
    // );

    setTimeout(() => {
      if (filteredProducts.length > 0) {
        setMessages(prev => [...prev, {id: Date.now() + 1, text: `"${text}" 관련 상품 ${filteredProducts.length}개를 찾았습니다.`, isUser: false}])
      } else {
        setMessages(prev => [...prev, {id: Date.now() + 1, text: `"${text}" 관련 상품을 찾을 수 없습니다. 다른 검색어를 입력해보세요.`, isUser: false}])
      }
    }, 500);
  };
  

  return (
    <div className="flex flex-col h-screen max-w-2xl mx-auto bg-gray-50 shadow-2xl rounded-lg overflow-hidden font-sans">
      <header className="bg-purple-600 text-white p-4 flex items-center justify-center sticky top-0 z-20 shadow-md">
        <div>
          <h1 className="text-xl font-semibold whitespace-nowrap">제품 카달로그 검색</h1>
        </div>
      </header>

      <main className="flex-grow p-4 space-y-2 overflow-y-auto">
        {messages.map((msg) => (
          <ChatBubble 
            key={msg.id} 
            isUser={msg.isUser}
            // 버튼 관련 props 제거 또는 수정 (여기서는 null로 전달)
            onButtonClick={null} 
            buttonText={null}
          >
            {msg.text}
          </ChatBubble>
        ))}
        
        {/* showProducts가 true이므로 항상 ProductCarousel이 렌더링됨 */}
        {showProducts && (
          <div className="my-4">
            <ProductCarousel products={currentProducts} /> 
          </div>
        )}
      </main>

      <MessageInput onSend={handleSendMessage} />
    </div>
  );
}