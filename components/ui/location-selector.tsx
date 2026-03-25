"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Country, State, City } from "country-state-city";
import { ChevronRight, MapPin, Globe } from "lucide-react";

interface LocationData {
  country: string;
  countryCode: string;
  state: string;
  stateCode: string;
  city: string;
  subArea?: string;
  zipCode: string;
}

interface LocationSelectorProps {
  value: LocationData;
  onChange: (location: LocationData) => void;
  className?: string;
  errors?: Partial<Record<"country" | "state" | "city" | "zipCode", string>>;
}

export default function LocationSelector({
  value,
  onChange,
  className,
  errors,
}: LocationSelectorProps) {
  const [countries] = useState(() => Country.getAllCountries());
  const [states, setStates] = useState<
    ReturnType<typeof State.getStatesOfCountry>
  >([]);
  const [cities, setCities] = useState<
    ReturnType<typeof City.getCitiesOfState>
  >([]);
  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);

  // Load states when country changes
  useEffect(() => {
    if (value.countryCode) {
      setLoadingStates(true);
      try {
        const countryStates = State.getStatesOfCountry(value.countryCode);
        setStates(countryStates);
      } catch (error) {
        console.error("Error loading states:", error);
        setStates([]);
      } finally {
        setLoadingStates(false);
      }
    } else {
      setStates([]);
    }
  }, [value.countryCode]);

  // Load cities when state changes
  useEffect(() => {
    if (value.countryCode && value.stateCode) {
      setLoadingCities(true);
      try {
        const stateCities = City.getCitiesOfState(
          value.countryCode,
          value.stateCode
        );
        setCities(stateCities);
      } catch (error) {
        console.error("Error loading cities:", error);
        setCities([]);
      } finally {
        setLoadingCities(false);
      }
    } else {
      setCities([]);
    }
  }, [value.countryCode, value.stateCode]);

  const handleCountryChange = (countryCode: string) => {
    const country = countries.find((c) => c.isoCode === countryCode);
    if (country) {
      onChange({
        country: country.name,
        countryCode: country.isoCode,
        state: "",
        stateCode: "",
        city: "",
        subArea: "",
        zipCode: value.zipCode,
      });
    }
  };

  const handleStateChange = (stateCode: string) => {
    const state = states.find((s) => s.isoCode === stateCode);
    if (state) {
      onChange({
        ...value,
        state: state.name,
        stateCode: state.isoCode,
        city: "",
        subArea: "",
      });
    }
  };

  const handleCityChange = (cityName: string) => {
    onChange({
      ...value,
      city: cityName,
      subArea: "",
    });
  };

  const handleSubAreaChange = (subArea: string) => {
    onChange({
      ...value,
      subArea,
    });
  };

  const handleZipChange = (zipCode: string) => {
    onChange({
      ...value,
      zipCode,
    });
  };

  const resetToCountry = () => {
    onChange({
      country: "",
      countryCode: "",
      state: "",
      stateCode: "",
      city: "",
      subArea: "",
      zipCode: value.zipCode,
    });
  };

  const resetToState = () => {
    onChange({
      ...value,
      state: "",
      stateCode: "",
      city: "",
      subArea: "",
    });
  };

  const resetToCity = () => {
    onChange({
      ...value,
      city: "",
      subArea: "",
    });
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Breadcrumb Navigation */}
      <div className="bg-gray-50 rounded-lg p-4 border">
        <div className="flex items-center space-x-2 mb-3">
          <MapPin className="h-4 w-4 text-blue-600" />
          <span className="text-sm font-medium text-gray-700">
            Location Selection
          </span>
        </div>

        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              {value.country ? (
                <BreadcrumbLink
                  onClick={resetToCountry}
                  className="cursor-pointer hover:text-blue-600"
                >
                  <Globe className="h-3 w-3 mr-1" />
                  Country
                </BreadcrumbLink>
              ) : (
                <BreadcrumbPage className="text-blue-600 font-medium">
                  <Globe className="h-3 w-3 mr-1" />
                  Select Country
                </BreadcrumbPage>
              )}
            </BreadcrumbItem>

            {value.country && (
              <>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  {value.state ? (
                    <BreadcrumbLink
                      onClick={resetToState}
                      className="cursor-pointer hover:text-blue-600"
                    >
                      {value.country}
                    </BreadcrumbLink>
                  ) : (
                    <BreadcrumbPage className="text-blue-600 font-medium">
                      {value.country}
                    </BreadcrumbPage>
                  )}
                </BreadcrumbItem>
              </>
            )}

            {value.state && (
              <>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  {value.city ? (
                    <BreadcrumbLink
                      onClick={resetToCity}
                      className="cursor-pointer hover:text-blue-600"
                    >
                      {value.state}
                    </BreadcrumbLink>
                  ) : (
                    <BreadcrumbPage className="text-blue-600 font-medium">
                      {value.state}
                    </BreadcrumbPage>
                  )}
                </BreadcrumbItem>
              </>
            )}

            {value.city && (
              <>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage className="text-blue-600 font-medium">
                    {value.city}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </>
            )}
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* Country Selection */}
      <div>
        <Label htmlFor="country" className="text-sm font-medium">
          Country *
        </Label>
        <Select value={value.countryCode} onValueChange={handleCountryChange}>
          <SelectTrigger
            className={`mt-1 ${errors?.country ? "border-destructive" : ""}`}
            aria-invalid={Boolean(errors?.country)}
            aria-describedby={errors?.country ? "location-country-error" : undefined}
          >
            <SelectValue placeholder="Select a country" />
          </SelectTrigger>
          <SelectContent>
            {countries.map((country) => (
              <SelectItem key={country.isoCode} value={country.isoCode}>
                <div className="flex items-center space-x-2">
                  <span className="text-lg">{country.flag}</span>
                  <span>{country.name}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors?.country && (
          <p id="location-country-error" className="mt-1 text-xs text-destructive">
            {errors.country}
          </p>
        )}
      </div>

      {/* State/Province Selection */}
      {value.countryCode && (
        <div>
          <Label htmlFor="state" className="text-sm font-medium">
            {value.country === "United States" ? "State" : "State/Province"} *
          </Label>
          <Select
            value={value.stateCode}
            onValueChange={handleStateChange}
            disabled={loadingStates || states.length === 0}
          >
            <SelectTrigger
              className={`mt-1 ${errors?.state ? "border-destructive" : ""}`}
              aria-invalid={Boolean(errors?.state)}
              aria-describedby={errors?.state ? "location-state-error" : undefined}
            >
              <SelectValue
                placeholder={
                  loadingStates
                    ? "Loading states..."
                    : states.length === 0
                    ? "No states available"
                    : `Select a ${
                        value.country === "United States"
                          ? "state"
                          : "state/province"
                      }`
                }
              />
            </SelectTrigger>
            <SelectContent>
              {states.map((state) => (
                <SelectItem key={state.isoCode} value={state.isoCode}>
                  {state.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors?.state && (
            <p id="location-state-error" className="mt-1 text-xs text-destructive">
              {errors.state}
            </p>
          )}
        </div>
      )}

      {/* City Selection */}
      {value.stateCode && (
        <div>
          <Label htmlFor="city" className="text-sm font-medium">
            City *
          </Label>
          <Select
            value={value.city}
            onValueChange={handleCityChange}
            disabled={loadingCities || cities.length === 0}
          >
            <SelectTrigger
              className={`mt-1 ${errors?.city ? "border-destructive" : ""}`}
              aria-invalid={Boolean(errors?.city)}
              aria-describedby={errors?.city ? "location-city-error" : undefined}
            >
              <SelectValue
                placeholder={
                  loadingCities
                    ? "Loading cities..."
                    : cities.length === 0
                    ? "No cities available or enter manually below"
                    : "Select a city"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {cities.map((city) => (
                <SelectItem key={city.name} value={city.name}>
                  {city.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Manual city input if no cities in database */}
          {value.stateCode && cities.length === 0 && (
            <div className="mt-2">
              <Input
                placeholder="Enter city name manually"
                value={value.city}
                onChange={(e) => handleCityChange(e.target.value)}
                aria-invalid={Boolean(errors?.city)}
                aria-describedby={errors?.city ? "location-city-error" : undefined}
                className={`text-sm ${errors?.city ? "border-destructive" : ""}`}
              />
            </div>
          )}
          {errors?.city && (
            <p id="location-city-error" className="mt-1 text-xs text-destructive">
              {errors.city}
            </p>
          )}
        </div>
      )}

      {/* Sub-area/District (Optional) */}
      {value.city && (
        <div>
          <Label htmlFor="subarea" className="text-sm font-medium">
            Sub-area/District (Optional)
          </Label>
          <Input
            id="subarea"
            placeholder="Enter area, district, or neighborhood"
            value={value.subArea || ""}
            onChange={(e) => handleSubAreaChange(e.target.value)}
            className="mt-1"
          />
        </div>
      )}

      {/* ZIP/Postal Code */}
      {value.country && (
        <div>
          <Label htmlFor="zipcode" className="text-sm font-medium">
            {value.country === "United States" ? "ZIP Code" : "Postal Code"} *
          </Label>
          <Input
            id="zipcode"
            placeholder={
              value.country === "United States"
                ? "Enter ZIP code (e.g., 12345)"
                : "Enter postal code"
            }
            value={value.zipCode}
            onChange={(e) => handleZipChange(e.target.value)}
            aria-invalid={Boolean(errors?.zipCode)}
            aria-describedby={
              errors?.zipCode ? "location-zip-error" : undefined
            }
            className={`mt-1 ${errors?.zipCode ? "border-destructive" : ""}`}
          />
          {errors?.zipCode && (
            <p id="location-zip-error" className="mt-1 text-xs text-destructive">
              {errors.zipCode}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
