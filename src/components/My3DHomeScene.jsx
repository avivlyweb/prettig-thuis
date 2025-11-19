import { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bolt, Heart, Info, X } from 'lucide-react';

// Simple OrbitControls implementation to avoid import issues
class SimpleOrbitControls {
  constructor(camera, domElement) {
    this.camera = camera;
    this.domElement = domElement;
    this.enabled = true;
    this.enableDamping = true;
    this.dampingFactor = 0.1;
    
    this.spherical = new THREE.Spherical();
    this.sphericalDelta = new THREE.Spherical();
    
    this.target = new THREE.Vector3();
    this.offset = new THREE.Vector3();
    
    this.isMouseDown = false;
    this.mouseStart = new THREE.Vector2();
    this.mouseDelta = new THREE.Vector2();
    
    this.bindEvents();
  }
  
  bindEvents() {
    this.domElement.addEventListener('mousedown', this.onMouseDown.bind(this));
    this.domElement.addEventListener('mousemove', this.onMouseMove.bind(this));
    this.domElement.addEventListener('mouseup', this.onMouseUp.bind(this));
    this.domElement.addEventListener('wheel', this.onMouseWheel.bind(this));
  }
  
  onMouseDown(event) {
    this.isMouseDown = true;
    this.mouseStart.set(event.clientX, event.clientY);
  }
  
  onMouseMove(event) {
    if (!this.isMouseDown) return;
    
    this.mouseDelta.set(event.clientX - this.mouseStart.x, event.clientY - this.mouseStart.y);
    
    const rotateSpeed = 0.005;
    this.sphericalDelta.theta -= this.mouseDelta.x * rotateSpeed;
    this.sphericalDelta.phi -= this.mouseDelta.y * rotateSpeed;
    
    this.mouseStart.set(event.clientX, event.clientY);
  }
  
  onMouseUp() {
    this.isMouseDown = false;
  }
  
  onMouseWheel(event) {
    const zoomSpeed = 0.1;
    this.camera.position.multiplyScalar(1 + event.deltaY * zoomSpeed * 0.001);
  }
  
  update() {
    this.offset.copy(this.camera.position).sub(this.target);
    this.spherical.setFromVector3(this.offset);
    
    this.spherical.theta += this.sphericalDelta.theta;
    this.spherical.phi += this.sphericalDelta.phi;
    
    this.spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, this.spherical.phi));
    
    this.offset.setFromSpherical(this.spherical);
    this.camera.position.copy(this.target).add(this.offset);
    this.camera.lookAt(this.target);
    
    if (this.enableDamping) {
      this.sphericalDelta.theta *= (1 - this.dampingFactor);
      this.sphericalDelta.phi *= (1 - this.dampingFactor);
    } else {
      this.sphericalDelta.set(0, 0, 0);
    }
  }
  
  dispose() {
    this.domElement.removeEventListener('mousedown', this.onMouseDown);
    this.domElement.removeEventListener('mousemove', this.onMouseMove);
    this.domElement.removeEventListener('mouseup', this.onMouseUp);
    this.domElement.removeEventListener('wheel', this.onMouseWheel);
  }
}

export default function My3DHomeScene() {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const controlsRef = useRef(null);
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseRef = useRef(new THREE.Vector2());

  // ICF-based state management
  const [energyLevel, setEnergyLevel] = useState(0.6); // b1300 - Energy level
  const [confidenceLevel, setConfidenceLevel] = useState(0.5); // b1266 - Confidence 
  const [socialConnection, setSocialConnection] = useState(0.4); // d7200, d750 - Social relationships
  const [stressLevel, setStressLevel] = useState(0.3); // d240 - Handling stress (lower is better)
  const [movementLevel, setMovementLevel] = useState(0.3); // d4501 - Walking
  const [lastActivity, setLastActivity] = useState('');
  const [showWelcome, setShowWelcome] = useState(true);

  const objects = useRef([]);
  const particles = useRef([]);

  const handleResize = useCallback(() => {
    if (cameraRef.current && rendererRef.current) {
      cameraRef.current.aspect = window.innerWidth / window.innerHeight;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(window.innerWidth, window.innerHeight);
    }
  }, []);

  // Create flowing particle system for ambient effects
  const createParticleSystem = useCallback((scene) => {
    const particleCount = 50;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 20;
      positions[i * 3 + 1] = Math.random() * 15;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 20;

      // Soft, warm colors
      colors[i * 3] = 0.8 + Math.random() * 0.2;     // R
      colors[i * 3 + 1] = 0.6 + Math.random() * 0.4; // G
      colors[i * 3 + 2] = 0.4 + Math.random() * 0.4; // B
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.1,
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending
    });

    const particleSystem = new THREE.Points(geometry, material);
    particleSystem.name = 'ambientParticles';
    scene.add(particleSystem);
    particles.current = particleSystem;
  }, []);

  // Create the central "Levensbron" (Source of Life)
  const createLevensbron = useCallback((scene) => {
    const group = new THREE.Group();
    group.name = 'levensbron';

    // Main trunk/stem
    const trunkGeometry = new THREE.CylinderGeometry(0.2, 0.4, 3, 8);
    const trunkMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x8B4513,
      roughness: 0.7,
      metalness: 0.1
    });
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.y = 1.5;
    group.add(trunk);

    // Central energy orb
    const orbGeometry = new THREE.SphereGeometry(0.8, 32, 32);
    const orbMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0x4fc3f7,
      emissiveIntensity: 0.3,
      transparent: true,
      opacity: 0.8
    });
    const orb = new THREE.Mesh(orbGeometry, orbMaterial);
    orb.position.y = 4;
    orb.name = 'energyOrb';
    group.add(orb);

    // Confidence particles (will be animated)
    const confGeometry = new THREE.BufferGeometry();
    const confPositions = new Float32Array(20 * 3);
    for (let i = 0; i < 20; i++) {
      confPositions[i * 3] = (Math.random() - 0.5) * 2;
      confPositions[i * 3 + 1] = 4 + Math.random() * 3;
      confPositions[i * 3 + 2] = (Math.random() - 0.5) * 2;
    }
    confGeometry.setAttribute('position', new THREE.BufferAttribute(confPositions, 3));
    const confMaterial = new THREE.PointsMaterial({
      size: 0.15,
      color: 0xffd700,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    });
    const confParticles = new THREE.Points(confGeometry, confMaterial);
    confParticles.name = 'confidenceParticles';
    group.add(confParticles);

    group.position.set(0, 0, 0);
    scene.add(group);
  }, []);

  // Create interactive zones
  const createInteractiveZones = useCallback((scene) => {
    // Living Nook - Comfort Chair
    const chairGeometry = new THREE.CylinderGeometry(1, 1.2, 1, 16);
    const chairMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x9c88ff,
      roughness: 0.6,
      metalness: 0.1
    });
    const chair = new THREE.Mesh(chairGeometry, chairMaterial);
    chair.position.set(-4, 0.5, 2);
    chair.name = 'restingChair';
    scene.add(chair);
    objects.current.push(chair);

    // Story Book (Memory Album trigger)
    const bookGeometry = new THREE.BoxGeometry(0.8, 0.1, 1.2);
    const bookMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x8B4513,
      roughness: 0.8
    });
    const book = new THREE.Mesh(bookGeometry, bookMaterial);
    book.position.set(-3, 1.1, 1);
    book.name = 'verhaalBoek';
    scene.add(book);
    objects.current.push(book);

    // Nourishment Zone - Dining Table
    const tableGeometry = new THREE.CylinderGeometry(1.5, 1.5, 0.1, 16);
    const tableMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xDEB887,
      roughness: 0.5
    });
    const table = new THREE.Mesh(tableGeometry, tableMaterial);
    table.position.set(4, 0.8, 0);
    table.name = 'diningTable';
    scene.add(table);
    objects.current.push(table);

    // Medicine Plant
    const plantGeometry = new THREE.ConeGeometry(0.3, 1.5, 8);
    const plantMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x32CD32,
      emissive: 0x006400,
      emissiveIntensity: 0.2
    });
    const plant = new THREE.Mesh(plantGeometry, plantMaterial);
    plant.position.set(6, 0.75, 2);
    plant.name = 'medicatiePlantje';
    scene.add(plant);
    objects.current.push(plant);

    // Movement Path (glowing path on floor)
    const pathGeometry = new THREE.PlaneGeometry(20, 1);
    const pathMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x87CEEB,
      emissive: 0x4169E1,
      emissiveIntensity: 0.1,
      transparent: true,
      opacity: 0.6
    });
    const path = new THREE.Mesh(pathGeometry, pathMaterial);
    path.rotation.x = -Math.PI / 2;
    path.position.set(0, 0.01, -6);
    path.name = 'wandelpad';
    scene.add(path);
    objects.current.push(path);
  }, []);

  const animate = useCallback(() => {
    requestAnimationFrame(animate);
    if (controlsRef.current) controlsRef.current.update();
    if (rendererRef.current && sceneRef.current && cameraRef.current) {
      rendererRef.current.render(sceneRef.current, cameraRef.current);
    }

    const time = Date.now() * 0.001;

    // Animate Levensbron based on ICF levels
    if (sceneRef.current) {
      const levensbron = sceneRef.current.getObjectByName('levensbron');
      if (levensbron) {
        // Energy Orb pulsing
        const energyOrb = levensbron.getObjectByName('energyOrb');
        if (energyOrb) {
          const intensity = 0.2 + energyLevel * 0.5;
          energyOrb.material.emissiveIntensity = intensity + Math.sin(time * 2) * 0.1;
          energyOrb.rotation.y += 0.005;
          energyOrb.position.y = 4 + Math.sin(time) * 0.3;
          
          // Color based on energy level
          const r = 0.3 + energyLevel * 0.4;
          const g = 0.8;
          const b = 1 - energyLevel * 0.3;
          energyOrb.material.emissive.setRGB(r, g, b);
        }

        // Confidence particles rising
        const confParticles = levensbron.getObjectByName('confidenceParticles');
        if (confParticles) {
          const positions = confParticles.geometry.attributes.position.array;
          for (let i = 0; i < positions.length; i += 3) {
            positions[i + 1] += confidenceLevel * 0.02; // Rise speed based on confidence
            if (positions[i + 1] > 8) {
              positions[i + 1] = 4; // Reset to base
            }
          }
          confParticles.geometry.attributes.position.needsUpdate = true;
        }
      }

      // Animate ambient particles
      if (particles.current) {
        const positions = particles.current.geometry.attributes.position.array;
        for (let i = 0; i < positions.length; i += 3) {
          positions[i] += Math.sin(time + i) * 0.001;
          positions[i + 1] += Math.cos(time + i * 0.5) * 0.002;
          positions[i + 2] += Math.sin(time * 0.7 + i) * 0.001;
        }
        particles.current.geometry.attributes.position.needsUpdate = true;
      }

      // Animate interactive objects based on ICF needs
      const chair = sceneRef.current.getObjectByName('restingChair');
      if (chair && stressLevel > 0.6) {
        chair.material.emissive.setRGB(0.1, 0.3, 0.1);
        chair.material.emissiveIntensity = 0.2 + Math.sin(time * 3) * 0.1;
      }

      const plant = sceneRef.current.getObjectByName('medicatiePlantje');
      if (plant) {
        plant.material.emissiveIntensity = 0.2 + Math.sin(time * 2) * 0.1;
        plant.rotation.y += 0.01;
      }

      const path = sceneRef.current.getObjectByName('wandelpad');
      if (path && movementLevel < 0.4) {
        path.material.emissiveIntensity = 0.3 + Math.sin(time * 4) * 0.2;
      }
    }
  }, [energyLevel, confidenceLevel, stressLevel, movementLevel]);

  useEffect(() => {
    const currentMount = mountRef.current;
    if (!currentMount) return;

    // Scene setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    
    // Gradient background for teamLab feel
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 256;
    canvas.height = 256;
    const gradient = context.createLinearGradient(0, 0, 0, 256);
    gradient.addColorStop(0, '#87CEEB'); // Sky blue
    gradient.addColorStop(0.5, '#E6E6FA'); // Lavender
    gradient.addColorStop(1, '#F0F8FF'); // Alice blue
    context.fillStyle = gradient;
    context.fillRect(0, 0, 256, 256);
    
    const texture = new THREE.CanvasTexture(canvas);
    scene.background = texture;

    // Camera
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(8, 6, 8);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    currentMount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Controls
    const controls = new SimpleOrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;
    controlsRef.current = controls;

    // Atmospheric lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
    directionalLight.position.set(10, 20, 5);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    // Soft spot lights for ambiance
    const spotLight1 = new THREE.SpotLight(0x87CEEB, 0.5, 20, Math.PI / 6, 0.2, 1);
    spotLight1.position.set(-5, 8, 5);
    scene.add(spotLight1);

    const spotLight2 = new THREE.SpotLight(0xFFB6C1, 0.3, 15, Math.PI / 8, 0.3, 1);
    spotLight2.position.set(5, 6, -5);
    scene.add(spotLight2);

    // Soft, reflective floor
    const floorGeometry = new THREE.PlaneGeometry(30, 30);
    const floorMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xf0f0f0,
      roughness: 0.1,
      metalness: 0.1
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Create the world
    createParticleSystem(scene);
    createLevensbron(scene);
    createInteractiveZones(scene);
    
    animate();

    // Mouse click interaction
    const handleMouseClick = (event) => {
      mouseRef.current.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouseRef.current.y = -(event.clientY / window.innerHeight) * 2 + 1;
      raycasterRef.current.setFromCamera(mouseRef.current, camera);
      const intersects = raycasterRef.current.intersectObjects(objects.current);

      if (intersects.length > 0) {
        const object = intersects[0].object;
        handleObjectInteraction(object);
      }
    };

    const handleObjectInteraction = (object) => {
      // Visual feedback
      const originalColor = object.material.color.getHex();
      const originalEmissive = object.material.emissive.getHex();
      
      object.material.emissive.setRGB(0.3, 0.8, 0.3);
      setTimeout(() => {
        object.material.emissive.setHex(originalEmissive);
      }, 500);

      // ICF-based interactions
      switch (object.name) {
        case 'restingChair':
          setLastActivity('Ontspannen in de comfortstoel (d240)');
          setStressLevel(Math.max(0.1, stressLevel - 0.2));
          setEnergyLevel(Math.min(1, energyLevel + 0.1));
          break;
        
        case 'verhaalBoek':
          setLastActivity('Herinneringen bekijken (d7200)');
          setSocialConnection(Math.min(1, socialConnection + 0.15));
          setConfidenceLevel(Math.min(1, confidenceLevel + 0.1));
          break;
        
        case 'diningTable':
          setLastActivity('Maaltijd voorbereiden (d630)');
          setEnergyLevel(Math.min(1, energyLevel + 0.15));
          break;
        
        case 'medicatiePlantje':
          setLastActivity('Medicatie genomen (p360)');
          setConfidenceLevel(Math.min(1, confidenceLevel + 0.05));
          break;
        
        case 'wandelpad':
          setLastActivity('Beweging en wandelen (d4501)');
          setMovementLevel(Math.min(1, movementLevel + 0.2));
          setEnergyLevel(Math.min(1, energyLevel + 0.1));
          setStressLevel(Math.max(0.1, stressLevel - 0.1));
          break;
      }
    };
    
    window.addEventListener('resize', handleResize);
    renderer.domElement.addEventListener('click', handleMouseClick);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (renderer.domElement) {
        renderer.domElement.removeEventListener('click', handleMouseClick);
      }
      if (controls) {
        controls.dispose();
      }
      if (currentMount && renderer.domElement) {
        currentMount.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [animate, handleResize, createParticleSystem, createLevensbron, createInteractiveZones, stressLevel, energyLevel, socialConnection, confidenceLevel, movementLevel]);

  return (
    <div className="w-full h-full relative">
      <div ref={mountRef} className="w-full h-full" />

      {/* UI Overlay */}
      <div className="absolute top-4 left-4 right-4 flex justify-between items-start pointer-events-none">
        {/* ICF Status Card */}
        <Card className="pointer-events-auto w-64 shadow-lg border-blue-200">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Bolt className="w-5 h-5 text-amber-500" />
              <h3 className="font-inter font-semibold text-gray-800">Levensbron Status</h3>
            </div>
            
            <div className="space-y-2">
              <div>
                <div className="flex justify-between text-sm">
                  <span>Energie (b1300)</span>
                  <span>{Math.round(energyLevel * 100)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-blue-400 to-green-400 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${energyLevel * 100}%` }}
                  ></div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-sm">
                  <span>Vertrouwen (b1266)</span>
                  <span>{Math.round(confidenceLevel * 100)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-yellow-400 to-amber-400 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${confidenceLevel * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Heart className="w-4 h-4 text-pink-500" />
              <span>Laatste activiteit:</span>
            </div>
            <p className="font-medium text-gray-800 text-center bg-gray-50 p-2 rounded-lg">{lastActivity || 'Verken je bloeiende wereld'}</p>
          </CardContent>
        </Card>
        
        {/* Welcome/Info */}
        {showWelcome && (
          <Card className="pointer-events-auto max-w-sm shadow-lg border-green-200">
            <CardContent className="p-4">
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                  <Info className="w-5 h-5 text-green-600" />
                  <h3 className="font-inter font-semibold text-gray-800">Welkom in De Bloeiende Wereld!</h3>
                </div>
                <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => setShowWelcome(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-sm text-gray-600">
                Klik op objecten om activiteiten uit te voeren. Zie hoe je Levensbron bloeit naarmate je dag vordert.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}