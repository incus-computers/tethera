import { create } from "zustand";
import { DeliveryLocation, ShippingRateOption } from "../shipping/types";
import { POPULAR_LOCATIONS, FLAGSHIP_ORIGIN } from "../shipping/distance";

interface LocationState {
  userLocation: DeliveryLocation | null;
  selectedRate: ShippingRateOption | null;
  isLocationModalOpen: boolean;
  recentLocations: DeliveryLocation[];
  
  // Actions
  initLocation: () => void;
  setLocation: (location: DeliveryLocation) => void;
  setSelectedRate: (rate: ShippingRateOption | null) => void;
  openLocationModal: () => void;
  closeLocationModal: () => void;
  clearLocation: () => void;
}

export const useLocationStore = create<LocationState>((set, get) => {
  return {
    // Deterministic default on both server and client to eliminate hydration mismatch
    userLocation: POPULAR_LOCATIONS[0], // Default to SCBD
    selectedRate: null,
    isLocationModalOpen: false,
    recentLocations: POPULAR_LOCATIONS.slice(0, 4),

    // Load from localStorage only after component mounts
    initLocation: () => {
      if (typeof window === "undefined") return;
      try {
        const saved = localStorage.getItem("tethera_user_location");
        if (saved) {
          const location = JSON.parse(saved);
          set((state) => ({
            userLocation: location,
            recentLocations: [
              location,
              ...state.recentLocations.filter((l) => l.address !== location.address),
            ].slice(0, 5),
          }));
        }
      } catch {
        // ignore
      }
    },

    setLocation: (location) => {
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("tethera_user_location", JSON.stringify(location));
        } catch {
          // ignore
        }
      }

      set((state) => {
        // Add to recents without duplicates
        const updatedRecents = [
          location,
          ...state.recentLocations.filter((l) => l.address !== location.address),
        ].slice(0, 5);

        return {
          userLocation: location,
          recentLocations: updatedRecents,
          selectedRate: null, // Reset rate to trigger recalculation for new location
        };
      });
    },

    setSelectedRate: (rate) => set({ selectedRate: rate }),
    openLocationModal: () => set({ isLocationModalOpen: true }),
    closeLocationModal: () => set({ isLocationModalOpen: false }),
    clearLocation: () => {
      if (typeof window !== "undefined") {
        localStorage.removeItem("tethera_user_location");
      }
      set({ userLocation: null, selectedRate: null });
    },
  };
});
