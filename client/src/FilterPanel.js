import React, { useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  FormControl,
  FormLabel,
  Input,
  Select,
  Button,
  SimpleGrid,
  Heading,
  Card,
  CardBody
} from '@chakra-ui/react';
import { SearchIcon, CloseIcon } from '@chakra-ui/icons';

const FilterPanel = ({ onFilter, onClear }) => {
  const [filters, setFilters] = useState({
    year: '',
    title: '',
    registry_number: '',
    date_from: '',
    date_to: '',
    type: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onFilter(filters);
  };

  const handleClear = () => {
    setFilters({
      year: '',
      title: '',
      registry_number: '',
      date_from: '',
      date_to: '',
      type: ''
    });
    onClear();
  };

  const currentYear = new Date().getFullYear();
  const yearOptions = [];
  for (let year = currentYear; year >= currentYear - 5; year--) {
    yearOptions.push(year);
  }

  return (
    <Card variant="outline" bg="white">
      <CardBody>
        <VStack spacing={6} align="stretch">
          <Heading as="h3" size="md" color="blue.600">
            Filteri za pretraživanje
          </Heading>
          
          <Box as="form" onSubmit={handleSubmit}>
            <VStack spacing={6} align="stretch">
              {/* Prvi red filtera */}
              <SimpleGrid columns={[1, 2, 3]} spacing={4}>
                <FormControl>
                  <FormLabel fontSize="sm" fontWeight="semibold">Godina</FormLabel>
                  <Select
                    name="year"
                    value={filters.year}
                    onChange={handleChange}
                    placeholder="Sve godine"
                    bg="gray.50"
                  >
                    {yearOptions.map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </Select>
                </FormControl>

                <FormControl>
                  <FormLabel fontSize="sm" fontWeight="semibold">Tip dopisa</FormLabel>
                  <Select
                    name="type"
                    value={filters.type}
                    onChange={handleChange}
                    placeholder="Svi tipovi"
                    bg="gray.50"
                  >
                    <option value="outgoing">Izlazni (01)</option>
                    <option value="incoming">Ulazni (02)</option>
                  </Select>
                </FormControl>

                <FormControl>
                  <FormLabel fontSize="sm" fontWeight="semibold">Urudžbeni broj</FormLabel>
                  <Input
                    name="registry_number"
                    value={filters.registry_number}
                    onChange={handleChange}
                    placeholder="npr. 01/01-2025"
                    bg="gray.50"
                  />
                </FormControl>
              </SimpleGrid>

              {/* Drugi red filtera */}
              <FormControl>
                <FormLabel fontSize="sm" fontWeight="semibold">Pretraži po naslovu</FormLabel>
                <Input
                  name="title"
                  value={filters.title}
                  onChange={handleChange}
                  placeholder="Unesite ključne riječi za pretraživanje naslova"
                  bg="gray.50"
                />
              </FormControl>

              {/* Treći red - datumi */}
              <SimpleGrid columns={[1, 2]} spacing={4}>
                <FormControl>
                  <FormLabel fontSize="sm" fontWeight="semibold">Datum od</FormLabel>
                  <Input
                    type="date"
                    name="date_from"
                    value={filters.date_from}
                    onChange={handleChange}
                    bg="gray.50"
                  />
                </FormControl>

                <FormControl>
                  <FormLabel fontSize="sm" fontWeight="semibold">Datum do</FormLabel>
                  <Input
                    type="date"
                    name="date_to"
                    value={filters.date_to}
                    onChange={handleChange}
                    bg="gray.50"
                  />
                </FormControl>
              </SimpleGrid>

              {/* Gumbovi */}
              <HStack spacing={4} justify="center" pt={4}>
                <Button
                  type="submit"
                  colorScheme="blue"
                  leftIcon={<SearchIcon />}
                  size="lg"
                  px={8}
                >
                  Filtriraj rezultate
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClear}
                  leftIcon={<CloseIcon />}
                  size="lg"
                  px={8}
                >
                  Očisti sve filtere
                </Button>
              </HStack>
            </VStack>
          </Box>
        </VStack>
      </CardBody>
    </Card>
  );
};

export default FilterPanel;