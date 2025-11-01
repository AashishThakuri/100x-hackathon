import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import AuthPage from './AuthPage';

const cards = [
  {
    id: 'everest',
    tag: 'TREKKING ADVENTURE',
    title: 'EVEREST BASE CAMP',
    subtitle: 'Sagarmatha Region',
    image: '/assets/card-everest.jpg',
  },
  {
    id: 'kathmandu',
    tag: 'CULTURAL TOUR',
    title: 'KATHMANDU VALLEY',
    subtitle: 'Ancient Heritage',
    image: '/assets/card-kathmandu.jpg',
  },
  {
    id: 'annapurna',
    tag: 'MOUNTAIN TREK',
    title: 'ANNAPURNA CIRCUIT',
    subtitle: 'Mountain Kingdom',
    image: '/assets/card-annapurna.jpg',
  },
  {
    id: 'chitwan',
    tag: 'WILDLIFE SAFARI',
    title: 'CHITWAN NATIONAL PARK',
    subtitle: 'Jungle Adventure',
    image: '/assets/card-chitwan.jpg',
  },
  {
    id: 'pokhara',
    tag: 'LAKE CITY',
    title: 'POKHARA VALLEY',
    subtitle: 'Mountain Reflections',
    image: '/assets/card-pokhara.jpg',
  },
  {
    id: 'langtang',
    tag: 'ALPINE ADVENTURE',
    title: 'LANGTANG VALLEY',
    subtitle: 'Sacred Mountains',
    image: '/assets/card-langtang.jpg',
  },
  {
    id: 'manaslu',
    tag: 'HIGH ALTITUDE',
    title: 'MANASLU CIRCUIT',
    subtitle: 'Mountain of Spirits',
    image: '/assets/card-manaslu.jpg',
  },
  {
    id: 'mustang',
    tag: 'DESERT TREK',
    title: 'UPPER MUSTANG',
    subtitle: 'Forbidden Kingdom',
    image: '/assets/card-mustang.jpg',
  },
  {
    id: 'bhaktapur',
    tag: 'CULTURAL FESTIVAL',
    title: 'BHAKTAPUR DURBAR',
    subtitle: 'Living Heritage',
    image: '/assets/card-bhaktapur.jpg',
  },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [activeIndex, setActiveIndex] = useState(0);
  const [cardOrder, setCardOrder] = useState([...Array(cards.length).keys()]); // [0,1,2,3,4]
  const [overlayImage, setOverlayImage] = useState(cards[0].image);
  const [baseImage, setBaseImage] = useState(cards[0].image);
  const [clipPath, setClipPath] = useState('inset(0 0 0 0 round 0px)');
  const [animate, setAnimate] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const cardRefs = useRef([]);

  const expandFromCard = (index) => {
    const el = cardRefs.current[index];
    if (!el) return;

    // Store current positions before reordering
    const currentCards = cardOrder.filter(i => i !== activeIndex);
    const cardPositions = {};
    currentCards.forEach((cardIndex, pos) => {
      const cardEl = cardRefs.current[cardIndex];
      if (cardEl) {
        cardPositions[cardIndex] = cardEl.getBoundingClientRect();
      }
    });

    const rect = el.getBoundingClientRect();
    const top = Math.max(0, rect.top);
    const left = Math.max(0, rect.left);
    const right = Math.max(0, window.innerWidth - rect.right);
    const bottom = Math.max(0, window.innerHeight - rect.bottom);

    const startClip = `inset(${top}px ${right}px ${bottom}px ${left}px round 24px)`;

    setAnimate(false);
    setBaseImage(cards[activeIndex].image);
    setOverlayImage(cards[index].image);
    setClipPath(startClip);
    setActiveIndex(index);

    // Reorder cards: move the current active card to the end
    setCardOrder(prevOrder => {
      const newOrder = prevOrder.filter(i => i !== index);
      newOrder.push(index);
      return newOrder;
    });

    // Apply FLIP animation after reorder
    requestAnimationFrame(() => {
      const newCards = cardOrder.filter(i => i !== index);
      newCards.forEach((cardIndex, newPos) => {
        const cardEl = cardRefs.current[cardIndex];
        if (cardEl) {
          if (cardPositions[cardIndex]) {
            // Existing card - use FLIP animation
            const oldPos = cardPositions[cardIndex];
            const newPos = cardEl.getBoundingClientRect();
            const deltaX = oldPos.left - newPos.left;
            
            // Apply transform without transition
            cardEl.style.transform = `translateX(${deltaX}px)`;
            cardEl.style.transition = 'none';
            
            // Animate back to new position
            requestAnimationFrame(() => {
              cardEl.style.transition = 'transform 600ms cubic-bezier(0.25, 0.46, 0.45, 0.94)';
              cardEl.style.transform = 'translateX(0)';
            });
          } else {
            // New card entering - slide in from right
            cardEl.style.transform = 'translateX(100px)';
            cardEl.style.opacity = '0';
            cardEl.style.transition = 'none';
            
            requestAnimationFrame(() => {
              cardEl.style.transition = 'transform 600ms cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 600ms cubic-bezier(0.25, 0.46, 0.45, 0.94)';
              cardEl.style.transform = 'translateX(0)';
              cardEl.style.opacity = '1';
            });
          }
        }
      });

      setAnimate(true);
      requestAnimationFrame(() => {
        setClipPath('inset(0 0 0 0 round 0px)');
      });
    });
  };

  const handleNext = () => {
    // Get the first card in the current order (excluding active card)
    const visibleCards = cardOrder.filter(i => i !== activeIndex);
    const nextIndex = visibleCards[0];
    expandFromCard(nextIndex);
  };

  const handlePrev = () => {
    // Get the last card in the current order (excluding active card)
    const visibleCards = cardOrder.filter(i => i !== activeIndex);
    const prevIndex = visibleCards[visibleCards.length - 1];
    expandFromCard(prevIndex);
  };

  useEffect(() => {
    const id = setInterval(handleNext, 4000);
    return () => clearInterval(id);
  }, [activeIndex, cardOrder]);

  useEffect(() => {
    // Preload first two card images before starting animation
    const preloadImages = async () => {
      const img1 = new Image();
      const img2 = new Image();
      img1.src = cards[0].image;
      img2.src = cards[1].image;
      
      await Promise.all([
        new Promise(resolve => { img1.onload = resolve; }),
        new Promise(resolve => { img2.onload = resolve; })
      ]);
      
      // Wait a bit more to ensure smooth rendering
      setTimeout(() => expandFromCard(0), 100);
    };
    
    preloadImages();
  }, []);

  useEffect(() => {
    cards.forEach((c) => {
      const img = new Image();
      img.src = c.image;
    });
  }, []);

  const handlePlanTrip = () => {
    if (currentUser) {
      navigate('/home');
    } else {
      setShowAuthModal(true);
    }
  };

  const handleLogin = () => {
    if (currentUser) {
      // If already logged in, go to home
      navigate('/home');
    } else {
      setShowAuthModal(true);
    }
  };

  const handleAuthSuccess = () => {
    setShowAuthModal(false);
    navigate('/home');
  };

  return (
    <div className="landing">
      <div className="hero-bg">
        <div className="bg-base" style={{ backgroundImage: `url(${baseImage})` }} />
        <div
          className={`bg-overlay ${animate ? 'animate' : ''}`}
          style={{ backgroundImage: `url(${overlayImage})`, clipPath }}
        />
        <div className="scrim-left" />
      </div>

      <div className="top-nav">
        <div className="brand"><span className="nepal">Nepal</span> <span className="connect">Connect</span></div>
        <button className="login-btn" onClick={handleLogin}>
          {currentUser ? 'Go to Home' : 'Login / Sign Up'}
        </button>
      </div>

      <div className="hero">
        <div className="hero-left">
          <div className="eyebrow">{cards[activeIndex].tag}</div>
          <h1 className="title" dangerouslySetInnerHTML={{ __html: cards[activeIndex].title.replace(/ /g, '<br />') }}></h1>
          <div className="subtitle">{cards[activeIndex].subtitle}</div>
          <div className="site-info">Make Every Journey Unforgettable in Nepal</div>
          <button className="cta" onClick={handlePlanTrip}>PLAN YOUR TRIP →</button>
        </div>

        <div className="hero-right">
          <div className="cards-row">
            {cardOrder.map((cardIndex, position) => {
              if (cardIndex === activeIndex) return null;
              const visibleCards = cardOrder.filter(i => i !== activeIndex);
              const visiblePosition = visibleCards.indexOf(cardIndex);
              
              // Show only first 3 cards
              if (visiblePosition >= 3) return null;
              
              const c = cards[cardIndex];
              return (
                <button
                  key={c.id}
                  className="trip-card"
                  style={{ 
                    backgroundImage: `url(${c.image})`,
                    backgroundPosition: c.id === 'mustang' ? 'center 30%' : 'center'
                  }}
                  onClick={() => expandFromCard(cardIndex)}
                  ref={(el) => (cardRefs.current[cardIndex] = el)}
                >
                  <div className="card-shade" />
                  <div className="card-text">
                    <div className="tag">{c.tag}</div>
                    <div className="card-title">{c.title}</div>
                    <div className="card-sub">{c.subtitle}</div>
                  </div>
                </button>
              );
            })}
          </div>
          <div className="nav-controls">
            <button className="nav-btn" onClick={handlePrev} aria-label="Previous">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <button className="nav-btn" onClick={handleNext} aria-label="Next">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Auth Modal */}
      {showAuthModal && (
        <AuthPage 
          onClose={() => setShowAuthModal(false)}
          onSuccess={handleAuthSuccess}
        />
      )}
    </div>
  );
}
