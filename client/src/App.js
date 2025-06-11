import React, { useState, useEffect } from 'react';
import {
  ChakraProvider,
  Box,
  Container,
  Heading,
  Button,
  VStack,
  HStack,
  Text,
  Badge,
  Spinner,
  Center,
  Flex,
  Spacer,
  useDisclosure,
  Collapse,
  Alert,
  AlertIcon,
  Card,
  CardHeader,
  CardBody,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  useToast
} from '@chakra-ui/react';
import { AddIcon, ViewIcon, ViewOffIcon, DeleteIcon, WarningIcon } from '@chakra-ui/icons';
import axios from 'axios';
import DocumentForm from './DocumentForm';
import FilterPanel from './FilterPanel';

function App() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingDocument, setEditingDocument] = useState(null);
  const [documentToDelete, setDocumentToDelete] = useState(null);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formKey, setFormKey] = useState(0); // Force form re-render
  
  const { isOpen: showForm, onOpen: openForm, onClose: closeForm } = useDisclosure();
  const { isOpen: showFilters, onToggle: toggleFilters } = useDisclosure();
  const { isOpen: showDeleteModal, onOpen: openDeleteModal, onClose: closeDeleteModal } = useDisclosure();
  const { isOpen: showDetailsModal, onOpen: openDetailsModal, onClose: closeDetailsModal } = useDisclosure();
  const toast = useToast();

  // Dohvaćanje dopisa s backend-a (s filterima)
  const fetchDocuments = async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      
      Object.keys(filters).forEach(key => {
        if (filters[key]) {
          params.append(key, filters[key]);
        }
      });

      const response = await axios.get(`http://localhost:5000/api/documents?${params}`);
      setDocuments(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Greška pri dohvaćanju dopisa:', error);
      setLoading(false);
    }
  };

  const handleFilter = (filters) => {
    fetchDocuments(filters);
  };

  const handleClearFilters = () => {
    fetchDocuments();
  };

  // Reset all form-related state
  const resetFormState = () => {
    setEditingDocument(null);
    setFormKey(prev => prev + 1); // Force form re-render with fresh state
  };

  // Handlers for form operations
  const handleAddNewDocument = () => {
    resetFormState(); // Clear any editing state
    openForm();
  };

  const handleEditDocument = (doc) => {
    resetFormState(); // Clear previous state first
    setTimeout(() => {
      setEditingDocument(doc); // Set new editing document
      setFormKey(prev => prev + 1); // Force fresh form
      openForm();
    }, 50); // Small delay to ensure state is clear
  };

  const handleFormCancel = () => {
    resetFormState();
    closeForm();
  };

  const handleDocumentSaved = () => {
    fetchDocuments(); // Refresh list
    resetFormState(); // Clear form state
    closeForm();
    
    toast({
      title: 'Uspjeh!',
      description: editingDocument ? 'Dopis je uspješno ažuriran' : 'Dopis je uspješno dodan',
      status: 'success',
      duration: 3000,
      isClosable: true,
    });
  };

  // Delete handlers
  const handleDeleteDocument = (doc) => {
    setDocumentToDelete(doc);
    openDeleteModal();
  };

  const handleDeleteFromDetails = (doc) => {
    closeDetailsModal();
    setDocumentToDelete(doc);
    openDeleteModal();
  };

  const confirmDelete = async () => {
    if (!documentToDelete) return;
    
    setIsDeleting(true);
    try {
      await axios.delete(`http://localhost:5000/api/documents/${documentToDelete.id}`);
      
      toast({
        title: 'Uspjeh!',
        description: 'Dopis je uspješno obrisan',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      
      fetchDocuments(); // Refresh list
      
    } catch (error) {
      console.error('Greška pri brisanju dopisa:', error);
      toast({
        title: 'Greška',
        description: 'Greška pri brisanju dopisa',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsDeleting(false);
      setDocumentToDelete(null);
      closeDeleteModal();
    }
  };

  const cancelDelete = () => {
    setDocumentToDelete(null);
    closeDeleteModal();
  };

  // Details modal handlers
  const handleDocumentClick = (doc) => {
    setSelectedDocument(doc);
    openDetailsModal();
  };

  const handleEditFromDetails = (doc) => {
    closeDetailsModal();
    handleEditDocument(doc); // Use the main edit handler
  };

  // Utility functions
  const getDocumentTypeColor = (registryNumber) => {
    if (registryNumber.startsWith('01')) return 'blue';
    if (registryNumber.startsWith('02')) return 'green';
    return 'gray';
  };

  const getDocumentTypeLabel = (registryNumber) => {
    if (registryNumber.startsWith('01')) return 'Izlazni';
    if (registryNumber.startsWith('02')) return 'Ulazni';
    return 'Nepoznato';
  };

  const getDocumentTypeText = (registryNumber) => {
    if (registryNumber.startsWith('01')) return 'Izlazni dopis (ZPGK šalje)';
    if (registryNumber.startsWith('02')) return 'Ulazni dopis';
    return 'Nepoznati tip';
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  if (loading) {
    return (
      <ChakraProvider>
        <Center h="100vh">
          <VStack spacing={4}>
            <Spinner size="xl" color="blue.500" />
            <Text>Učitavanje...</Text>
          </VStack>
        </Center>
      </ChakraProvider>
    );
  }

  return (
    <ChakraProvider>
      <Box minH="100vh" bg="gray.50">
        <Container maxW="7xl" py={6}>
          {/* Header */}
          <Box bg="white" p={6} borderRadius="lg" shadow="sm" mb={6}>
            <Flex align="center">
              <Heading as="h1" size="xl" color="blue.600">
                Urudžbeni zapisnik
              </Heading>
              <Spacer />
              <HStack spacing={3}>
                <Button
                  leftIcon={showFilters ? <ViewOffIcon /> : <ViewIcon />}
                  colorScheme="gray"
                  variant="outline"
                  onClick={toggleFilters}
                >
                  {showFilters ? 'Sakrij filtere' : 'Prikaži filtere'}
                </Button>
                <Button
                  leftIcon={<AddIcon />}
                  colorScheme="blue"
                  onClick={handleAddNewDocument}
                >
                  Dodaj novi dopis
                </Button>
              </HStack>
            </Flex>
          </Box>

          {/* Filter Panel */}
          <Collapse in={showFilters}>
            <Box mb={6}>
              <FilterPanel 
                onFilter={handleFilter}
                onClear={handleClearFilters}
              />
            </Box>
          </Collapse>

          {/* Document Form */}
          <Collapse in={showForm}>
            <Box bg="white" p={6} borderRadius="lg" shadow="sm" mb={6}>
              <Heading as="h2" size="lg" mb={4} color="blue.600">
                {editingDocument ? 'Uređivanje dopisa' : 'Dodavanje novog dopisa'}
              </Heading>
              <DocumentForm 
                key={formKey} // Force re-render on key change
                editingDocument={editingDocument}
                onDocumentSaved={handleDocumentSaved}
                onCancel={handleFormCancel}
              />
            </Box>
          </Collapse>

          {/* Documents List */}
          <Box bg="white" p={6} borderRadius="lg" shadow="sm">
            <Flex align="center" mb={4}>
              <Heading as="h2" size="lg" color="blue.600">
                Popis dopisa
              </Heading>
              <Spacer />
              <Badge colorScheme="blue" fontSize="md" px={3} py={1}>
                {documents.length} {documents.length === 1 ? 'dopis' : 'dopisa'}
              </Badge>
            </Flex>
            
            {documents.length === 0 ? (
              <Alert status="info" borderRadius="md">
                <AlertIcon />
                Nema dopisa u sustavu.
              </Alert>
            ) : (
              <VStack spacing={4} align="stretch">
                {documents.map(doc => (
                  <Card 
                    key={doc.id} 
                    variant="outline" 
                    _hover={{ shadow: 'md', borderColor: 'blue.300', cursor: 'pointer' }}
                    onClick={() => handleDocumentClick(doc)}
                  >
                    <CardHeader pb={2}>
                      <Flex align="center">
                        <Badge 
                          colorScheme={getDocumentTypeColor(doc.registry_number)}
                          mr={3}
                          fontSize="sm"
                        >
                          {getDocumentTypeLabel(doc.registry_number)}
                        </Badge>
                        <Text fontWeight="bold" fontSize="lg" color="blue.600">
                          {doc.registry_number}
                        </Text>
                        <Spacer />
                        <Text color="gray.600" fontSize="sm">
                          {new Date(doc.date).toLocaleDateString('hr-HR')}
                        </Text>
                      </Flex>
                    </CardHeader>
                    <CardBody pt={0}>
                      <VStack align="start" spacing={2}>
                        <Heading as="h3" size="md" color="gray.800">
                          {doc.title}
                        </Heading>
                        <Text color="gray.600">
                          <Text as="span" fontWeight="semibold">Pošiljatelj:</Text> {doc.sender}
                        </Text>
                        {doc.notes && (
                          <Text 
                            color="gray.700" 
                            fontSize="sm" 
                            bg="gray.50" 
                            p={3} 
                            borderRadius="md" 
                            w="full"
                            noOfLines={2}
                          >
                            {doc.notes}
                          </Text>
                        )}
                      </VStack>
                    </CardBody>
                  </Card>
                ))}
              </VStack>
            )}
          </Box>
        </Container>
      </Box>

      {/* Modal za potvrdu brisanja */}
      <Modal isOpen={showDeleteModal} onClose={cancelDelete} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            <HStack>
              <WarningIcon color="red.500" />
              <Text>Potvrda brisanja dopisa</Text>
            </HStack>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4} align="start">
              <Text>
                Jeste li sigurni da želite trajno obrisati ovaj dopis?
              </Text>
              {documentToDelete && (
                <Box p={4} bg="gray.50" borderRadius="md" w="full">
                  <VStack align="start" spacing={2}>
                    <Text fontWeight="semibold" color="blue.600">
                      {documentToDelete.registry_number}
                    </Text>
                    <Text fontWeight="semibold">
                      {documentToDelete.title}
                    </Text>
                    <Text fontSize="sm" color="gray.600">
                      Pošiljatelj: {documentToDelete.sender}
                    </Text>
                    <Text fontSize="sm" color="gray.600">
                      Datum: {new Date(documentToDelete.date).toLocaleDateString('hr-HR')}
                    </Text>
                  </VStack>
                </Box>
              )}
              <Alert status="warning" borderRadius="md">
                <AlertIcon />
                <Text fontSize="sm">
                  Ova akcija se ne može poništiti. Dopis će biti trajno uklonjen iz sustava.
                </Text>
              </Alert>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" mr={3} onClick={cancelDelete}>
              Odustani
            </Button>
            <Button 
              colorScheme="red" 
              onClick={confirmDelete}
              isLoading={isDeleting}
              loadingText="Brisanje..."
              leftIcon={<DeleteIcon />}
            >
              Obriši dopis
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Modal za detalje dopisa */}
      <Modal isOpen={showDetailsModal} onClose={closeDetailsModal} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            <Flex align="center" w="full" pr={8}>
              <Text>Detalji dopisa</Text>
              <Spacer />
              {selectedDocument && (
                <Badge 
                  colorScheme={getDocumentTypeColor(selectedDocument.registry_number)}
                  fontSize="sm"
                >
                  {getDocumentTypeLabel(selectedDocument.registry_number)}
                </Badge>
              )}
            </Flex>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {selectedDocument && (
              <VStack spacing={6} align="stretch">
                {/* Osnovni podaci */}
                <Box>
                  <Text fontSize="2xl" fontWeight="bold" color="blue.600" mb={2}>
                    {selectedDocument.registry_number}
                  </Text>
                  <Text fontSize="lg" fontWeight="semibold" mb={3}>
                    {selectedDocument.title}
                  </Text>
                </Box>

                {/* Informacije */}
                <VStack spacing={4} align="stretch">
                  <HStack>
                    <Text fontWeight="semibold" minW="120px">Tip dopisa:</Text>
                    <Text>{getDocumentTypeText(selectedDocument.registry_number)}</Text>
                  </HStack>
                  
                  <HStack>
                    <Text fontWeight="semibold" minW="120px">Pošiljatelj:</Text>
                    <Text>{selectedDocument.sender}</Text>
                  </HStack>
                  
                  <HStack>
                    <Text fontWeight="semibold" minW="120px">Datum:</Text>
                    <Text>{new Date(selectedDocument.date).toLocaleDateString('hr-HR')}</Text>
                  </HStack>

                  {selectedDocument.created_at && (
                    <HStack>
                      <Text fontWeight="semibold" minW="120px">Kreiran:</Text>
                      <Text fontSize="sm" color="gray.600">
                        {new Date(selectedDocument.created_at).toLocaleString('hr-HR')}
                      </Text>
                    </HStack>
                  )}

                  {selectedDocument.updated_at && selectedDocument.updated_at !== selectedDocument.created_at && (
                    <HStack>
                      <Text fontWeight="semibold" minW="120px">Ažuriran:</Text>
                      <Text fontSize="sm" color="gray.600">
                        {new Date(selectedDocument.updated_at).toLocaleString('hr-HR')}
                      </Text>
                    </HStack>
                  )}
                </VStack>

                {/* Bilješke */}
                {selectedDocument.notes && (
                  <Box>
                    <Text fontWeight="semibold" mb={2}>Bilješka/sadržaj:</Text>
                    <Box 
                      p={4} 
                      bg="gray.50" 
                      borderRadius="md" 
                      border="1px" 
                      borderColor="gray.200"
                    >
                      <Text whiteSpace="pre-wrap">{selectedDocument.notes}</Text>
                    </Box>
                  </Box>
                )}

                {/* PDF prilog */}
                {selectedDocument.pdf_filename && (
                  <Box>
                    <Text fontWeight="semibold" mb={2}>Prilog:</Text>
                    <Box 
                      p={3} 
                      bg="blue.50" 
                      borderRadius="md" 
                      border="1px" 
                      borderColor="blue.200"
                    >
                      <HStack>
                        <Text fontSize="sm" color="blue.700">
                          📄 {selectedDocument.pdf_filename}
                        </Text>
                        <Spacer />
                        <Button 
                          size="xs" 
                          colorScheme="blue" 
                          variant="outline"
                          onClick={() => window.open(`http://localhost:5000/api/documents/${selectedDocument.id}/download`, '_blank')}
                        >
                          Preuzmi
                        </Button>
                      </HStack>
                    </Box>
                  </Box>
                )}
              </VStack>
            )}
          </ModalBody>
          <ModalFooter>
            <HStack spacing={3}>
              <Button 
                colorScheme="blue"
                variant="outline"
                onClick={() => handleEditFromDetails(selectedDocument)}
              >
                Uredi dopis
              </Button>
              <Button 
                colorScheme="red"
                variant="outline"
                leftIcon={<DeleteIcon />}
                onClick={() => handleDeleteFromDetails(selectedDocument)}
              >
                Obriši dopis
              </Button>
              <Button onClick={closeDetailsModal}>
                Zatvori
              </Button>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </ChakraProvider>
  );
}

export default App;