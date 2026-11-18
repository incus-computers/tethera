import { create } from "zustand";
import { DeliveryLocation, ShippingRateOption } from "../shipping/types";
import { POPULAR_LOCATIONS, FLAGSHIP_ORIGIN } from "../shipping/distance";
import { validCustomerLocation } from "../shipping/locationValidation";

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
    userLocation: null,
    selectedRate: null,
    isLocationModalOpen: false,
    recentLocations: [],

    // Load from localStorage only after component mounts
    initLocation: () => {
      if (typeof window === "undefined") return;
      try {
        const saved = localStorage.getItem("tethera_user_location_v2");
        if (saved) {
          const record=JSON.parse(saved);
          if(record.confirmed!==true||!validCustomerLocation(record.location))return;
          const location = record.location;
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
      if(!validCustomerLocation(location))throw new Error("Enter a complete Indonesian delivery address before confirming.");
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("tethera_user_location_v2", JSON.stringify({confirmed:true,location}));
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
        localStorage.removeItem("tethera_user_location_v2");
      }
      set({ userLocation: null, selectedRate: null });
    },
  };
});
