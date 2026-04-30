import { useState, useEffect, useRef } from "react";
import { AlbumItem } from "@/entities/AlbumItem";
import { User } from "@/entities/User";
import { Button } from "@/components/ui/button";
import { X, Play, Pause, SkipForward, SkipBack, Volume2, VolumeX } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function GoudenMomenten() {
  const [albumItems, setAlbumItems] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [loading, setLoading] = useState(true);
  const [showControls, setShowControls] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [_user, setUser] = useState(null);
  
  const intervalRef = useRef(null);
  const videoRef = useRef(null);
  const controlsTimeoutRef = useRef(null);

  const SLIDE_DURATION = 8000; // 8 seconds per image
  const MAX_VIDEO_DURATION = 15000; // Max 15 seconds for videos

  useEffect(() => {
    loadData();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (albumItems.length > 0 && isPlaying) {
      startSlideshow();
    } else {
      stopSlideshow();
    }
    return () => stopSlideshow();
  }, [albumItems, isPlaying, currentIndex]);

  const loadData = async () => {
    try {
      const currentUser = await User.me().catch(() => null);
      setUser(currentUser);

      // Load all album items for demonstration
      const items = await AlbumItem.list();
      if (items.length > 0) {
        setAlbumItems(items);
      } else {
        // Show sample message if no items
        setAlbumItems([]);
      }
    } catch (error) {
      console.error("Error loading album items:", error);
    }
    setLoading(false);
  };

  const startSlideshow = () => {
    stopSlideshow(); // Clear any existing interval
    
    const currentItem = albumItems[currentIndex];
    if (!currentItem) return;

    let duration = SLIDE_DURATION;
    
    // For videos, we'll let them play and then move to next
    if (currentItem.media_type === 'video') {
      duration = MAX_VIDEO_DURATION;
    }

    intervalRef.current = setTimeout(() => {
      nextSlide();
    }, duration);
  };

  const stopSlideshow = () => {
    if (intervalRef.current) {
      clearTimeout(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % albumItems.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + albumItems.length) % albumItems.length);
  };

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
    }
  };

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 3000);
  };

  const handleVideoEnded = () => {
    nextSlide();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin w-12 h-12 border-4 border-amber-400 border-t-transparent rounded-full mx-auto"></div>
          <p className="text-white text-lg">Gouden momenten worden geladen...</p>
        </div>
      </div>
    );
  }

  if (albumItems.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center p-8">
        <div className="text-center max-w-md space-y-6">
          <div className="w-24 h-24 bg-amber-200 rounded-full flex items-center justify-center mx-auto">
            <Play className="w-12 h-12 text-amber-700" />
          </div>
          <h1 className="font-inter font-bold text-3xl text-gray-900">Gouden Momenten</h1>
          <p className="text-gray-700 font-lato leading-relaxed">
            Er zijn nog geen foto's of video's toegevoegd aan je geheugenalbum. 
            Vraag je mantelzorger om mooie herinneringen toe te voegen.
          </p>
          <Button
            onClick={() => window.history.back()}
            className="bg-amber-600 hover:bg-amber-700 text-white px-8 py-3 rounded-xl"
          >
            Terug naar het Menu
          </Button>
        </div>
      </div>
    );
  }

  const currentItem = albumItems[currentIndex];

  return (
    <div 
      className="min-h-screen bg-black relative overflow-hidden cursor-none"
      onMouseMove={handleMouseMove}
      onTouchStart={handleMouseMove}
    >
      {/* Main Content */}
      <div className="absolute inset-0 flex items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            className="w-full h-full flex items-center justify-center"
          >
            {currentItem.media_type === 'video' && currentItem.video_url ? (
              <video
                ref={videoRef}
                src={currentItem.video_url}
                autoPlay
                muted={isMuted}
                onEnded={handleVideoEnded}
                className="max-w-full max-h-full object-contain shadow-2xl"
                style={{ maxWidth: '95vw', maxHeight: '95vh' }}
              />
            ) : (
              <img
                src={currentItem.image_url}
                alt={currentItem.title}
                className="max-w-full max-h-full object-contain shadow-2xl rounded-lg"
                style={{ maxWidth: '95vw', maxHeight: '95vh' }}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Subtle Caption Overlay */}
      <AnimatePresence>
        {showControls && currentItem.title && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-20 left-1/2 transform -translate-x-1/2 bg-black/70 backdrop-blur-sm text-white px-6 py-3 rounded-xl"
          >
            <h3 className="font-inter font-semibold text-lg text-center">{currentItem.title}</h3>
            {currentItem.caption && (
              <p className="font-lato text-sm text-gray-300 text-center mt-1">{currentItem.caption}</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Controls Overlay */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 pointer-events-none"
          >
            {/* Top Controls */}
            <div className="absolute top-6 left-6 right-6 flex justify-between items-start pointer-events-auto">
              <div className="flex items-center space-x-3">
                <h1 className="font-inter font-bold text-2xl text-white drop-shadow-lg">
                  Gouden Momenten
                </h1>
                <div className="bg-white/20 backdrop-blur-sm text-white text-sm px-3 py-1 rounded-full">
                  {currentIndex + 1} van {albumItems.length}
                </div>
              </div>
              
              <Button
                onClick={() => window.history.back()}
                variant="ghost"
                size="icon"
                className="bg-black/50 hover:bg-black/70 text-white rounded-full w-12 h-12"
              >
                <X className="w-6 h-6" />
              </Button>
            </div>

            {/* Bottom Controls */}
            <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 pointer-events-auto">
              <div className="flex items-center space-x-4 bg-black/70 backdrop-blur-sm rounded-2xl px-6 py-3">
                <Button
                  onClick={prevSlide}
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/20 rounded-full"
                >
                  <SkipBack className="w-5 h-5" />
                </Button>
                
                <Button
                  onClick={togglePlayPause}
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/20 rounded-full"
                >
                  {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                </Button>
                
                <Button
                  onClick={nextSlide}
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/20 rounded-full"
                >
                  <SkipForward className="w-5 h-5" />
                </Button>

                {currentItem.media_type === 'video' && (
                  <Button
                    onClick={toggleMute}
                    variant="ghost"
                    size="icon"
                    className="text-white hover:bg-white/20 rounded-full"
                  >
                    {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                  </Button>
                )}
              </div>
            </div>

            {/* Progress Indicator */}
            <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex space-x-2 pointer-events-auto">
              {albumItems.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    index === currentIndex 
                      ? 'bg-white' 
                      : 'bg-white/40 hover:bg-white/60'
                  }`}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
