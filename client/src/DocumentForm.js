import React, { useState, useEffect, useCallback } from 'react';
import {
  VStack,
  HStack,
  FormControl,
  FormLabel,
  Input,
  Select,
  Textarea,
  Button,
  Alert,
  AlertIcon,
  useToast,
  Box,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  Text,
  Badge
} from '@chakra-ui/react';
import { CheckIcon, CloseIcon, WarningIcon } from '@chakra-ui/icons';
import axios from 'axios';

const DocumentForm = ({ editingDocument, onDocumentSaved, onCancel }) => {
  // Initial form state
  const getInitialFormData = () => ({
    type: 'zpgk_out',
    sender: '',
    registry_number: '',
    title: '',
    date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  const [formData, setFormData] = useState(getInitialFormData());
  const [submitting, setSubmitting] = useState(false);
  const [loadingNumber, setLoadingNumber] = useState(false);
  const [originalRegistryNumber, setOriginalRegistryNumber] = useState('');
  const [pendingRegistryNumber, setPendingRegistryNumber] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileError, setFileError] = useState('');
  
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const isEditing = !!editingDocument;

  // Funkcija za dohvaćanje sljedećeg broja
  const fetchNextNumber = useCallback(async (type) => {
    if (isEditing) return; // Ne generiraj novi broj za uređivanje
    
    setLoadingNumber(true);
    try {
      const response = await axios.get(`http://localhost:5000/api/documents/next-number/${type}`);
      setFormData(prev => ({
        ...prev,
        registry_number: response.data.registry_number
      }));
    } catch (error) {
      console.error('Greška pri dohvaćanju broja:', error);
      toast({
        title: 'Greška',
        description: 'Greška pri dohvaćanju urudžbenog broja',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setLoadingNumber(false);
    }
  }, [isEditing, toast]);

  // Kompletni reset forme
  const resetForm = useCallback(() => {
    setFormData(getInitialFormData());
    setOriginalRegistryNumber('');
    setPendingRegistryNumber('');
    setSelectedFile(null);
    setFileError('');
    
    // Reset file input
    const fileInput = document.getElementById('pdf-upload');
    if (fileInput) fileInput.value = '';
  }, []);

  // Effect za setup forme ovisno o editing/new stanju
  useEffect(() => {
    if (editingDocument) {
      // Uređivanje postojećeg dopisa - popuni podatke
      const docData = {
        type: editingDocument.type,
        sender: editingDocument.sender,
        registry_number: editingDocument.registry_number,
        title: editingDocument.title,
        date: editingDocument.date,
        notes: editingDocument.notes || ''
      };
      setFormData(docData);
      setOriginalRegistryNumber(editingDocument.registry_number);
      setSelectedFile(null); // Reset file selection for editing
    } else {
      // Novi dopis - resetiraj sve i dohvati novi broj
      resetForm();
      fetchNextNumber('zpgk_out');
    }
    
    setFileError(''); // Reset file error
  }, [editingDocument, fetchNextNumber, resetForm]); // Added missing dependencies

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Ako se mijenja urudžbeni broj tijekom uređivanja, pokaži upozorenje
    if (name === 'registry_number' && isEditing && value !== originalRegistryNumber && value !== formData.registry_number) {
      setPendingRegistryNumber(value);
      onOpen();
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Ako se promijeni tip dopisa i nije uređivanje, dohvati novi broj
    if (name === 'type' && !isEditing) {
      fetchNextNumber(value);
    }
  };

  const confirmRegistryNumberChange = () => {
    setFormData(prev => ({
      ...prev,
      registry_number: pendingRegistryNumber
    }));
    setPendingRegistryNumber('');
    onClose();
  };

  const cancelRegistryNumberChange = () => {
    setPendingRegistryNumber('');
    onClose();
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setFileError('');
    
    if (!file) {
      setSelectedFile(null);
      return;
    }

    // Validacija file tipa
    if (file.type !== 'application/pdf') {
      setFileError('Molimo odaberite PDF datoteku');
      setSelectedFile(null);
      return;
    }

    // Validacija veličine (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      setFileError('Datoteka je prevelika. Maksimalna veličina je 10MB');
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
  };

  const removeFile = () => {
    setSelectedFile(null);
    setFileError('');
    // Reset file input
    const fileInput = document.getElementById('pdf-upload');
    if (fileInput) fileInput.value = '';
  };

  const removeExistingAttachment = async () => {
    if (!isEditing || !editingDocument.pdf_filename) return;

    try {
      await axios.delete(`http://localhost:5000/api/documents/${editingDocument.id}/attachment`);
      
      toast({
        title: 'Uspjeh!',
        description: 'Prilog je uspješno uklonjen',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      // Ažuriraj lokalni state - ukloni pdf_filename
      onDocumentSaved(); // Refresh parent component
      
    } catch (error) {
      console.error('Greška pri uklanjanju priloga:', error);
      toast({
        title: 'Greška',
        description: 'Greška pri uklanjanju priloga',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const dataToSend = {
        ...formData,
        sender: formData.type === 'third_party_in' ? formData.sender : 
                formData.type === 'zpgk_out' ? 'ZPGK' : 'HAZU'
      };

      // Kreiraj FormData za file upload
      const formDataToSend = new FormData();
      
      // Dodaj sve form podatke
      Object.keys(dataToSend).forEach(key => {
        formDataToSend.append(key, dataToSend[key]);
      });

      // Dodaj PDF file ako je odabran
      if (selectedFile) {
        formDataToSend.append('pdf', selectedFile);
      }

      if (isEditing) {
        // Ažuriraj postojeći dopis
        await axios.put(`http://localhost:5000/api/documents/${editingDocument.id}`, formDataToSend, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
      } else {
        // Stvori novi dopis
        await axios.post('http://localhost:5000/api/documents', formDataToSend, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
      }

      // Reset forme i pozovi callback
      resetForm();
      onDocumentSaved();
      
    } catch (error) {
      console.error('Greška pri spremanju dopisa:', error);
      toast({
        title: 'Greška',
        description: `Greška pri ${isEditing ? 'ažuriranju' : 'dodavanju'} dopisa u sustav`,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box as="form" onSubmit={handleSubmit}>
      <VStack spacing={6} align="stretch">
        <HStack spacing={4} align="top">
          <FormControl isRequired>
            <FormLabel>Tip dopisa</FormLabel>
            <Select
              name="type"
              value={formData.type}
              onChange={handleChange}
              bg="white"
              isDisabled={isEditing} // Ne dozvoli mijenjanje tipa pri uređivanju
            >
              <option value="zpgk_out">ZPGK šalje</option>
              <option value="hazu_in">HAZU šalje</option>
              <option value="third_party_in">Treća strana šalje</option>
            </Select>
          </FormControl>

          <FormControl isRequired>
            <FormLabel>Urudžbeni broj</FormLabel>
            <Input
              name="registry_number"
              value={loadingNumber ? '' : formData.registry_number}
              onChange={handleChange}
              placeholder={loadingNumber ? 'Generiranje...' : 'Urudžbeni broj'}
              isDisabled={loadingNumber}
              bg="white"
            />
          </FormControl>
        </HStack>

        {formData.type === 'third_party_in' && (
          <FormControl isRequired>
            <FormLabel>Pošiljatelj</FormLabel>
            <Input
              name="sender"
              value={formData.sender}
              onChange={handleChange}
              placeholder="Unesite naziv pošiljatelja"
              bg="white"
            />
          </FormControl>
        )}

        <FormControl isRequired>
          <FormLabel>Naslov dopisa</FormLabel>
          <Input
            name="title"
            value={formData.title}
            onChange={handleChange}
            placeholder="Unesite naslov dopisa"
            bg="white"
          />
        </FormControl>

        <FormControl isRequired>
          <FormLabel>Datum</FormLabel>
          <Input
            type="date"
            name="date"
            value={formData.date}
            onChange={handleChange}
            bg="white"
          />
        </FormControl>

        <FormControl>
          <FormLabel>Bilješka/sadržaj</FormLabel>
          <Textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            placeholder="Kratka bilješka o sadržaju dopisa (opciono)"
            rows={4}
            bg="white"
            resize="vertical"
          />
        </FormControl>

        {/* PDF Upload */}
        <FormControl>
          <FormLabel>PDF prilog</FormLabel>
          <VStack align="stretch" spacing={3}>
            {!selectedFile ? (
              <Box
                p={8}
                border="2px dashed"
                borderColor="gray.300"
                borderRadius="md"
                textAlign="center"
                bg="gray.50"
                _hover={{ borderColor: "blue.400", bg: "blue.50" }}
                cursor="pointer"
                position="relative"
                transition="all 0.2s"
              >
                <Input
                  id="pdf-upload"
                  type="file"
                  accept=".pdf"
                  onChange={handleFileChange}
                  position="absolute"
                  top={0}
                  left={0}
                  width="100%"
                  height="100%"
                  opacity={0}
                  cursor="pointer"
                />
                <VStack spacing={3}>
                  <Box fontSize="3xl">📄</Box>
                  <VStack spacing={1}>
                    <Text fontWeight="semibold" color="gray.700">
                      Kliknite za odabir PDF datoteke
                    </Text>
                    <Text fontSize="sm" color="gray.500">
                      ili je povucite ovdje
                    </Text>
                  </VStack>
                  <Text fontSize="xs" color="gray.400">
                    Maksimalna veličina: 10MB
                  </Text>
                </VStack>
              </Box>
            ) : (
              <Box p={4} bg="blue.50" borderRadius="md" border="1px" borderColor="blue.200">
                <HStack justify="space-between" align="start">
                  <HStack spacing={3}>
                    <Box fontSize="2xl">📄</Box>
                    <VStack align="start" spacing={1}>
                      <Text fontSize="sm" fontWeight="semibold" color="blue.700">
                        {selectedFile.name}
                      </Text>
                      <Text fontSize="xs" color="blue.600">
                        Veličina: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </Text>
                      <Badge colorScheme="green" size="sm">
                        Spreman za upload
                      </Badge>
                    </VStack>
                  </HStack>
                  <Button size="sm" variant="ghost" colorScheme="red" onClick={removeFile}>
                    ✕
                  </Button>
                </HStack>
              </Box>
            )}
            
            {fileError && (
              <Alert status="error" borderRadius="md">
                <AlertIcon />
                {fileError}
              </Alert>
            )}

            {isEditing && editingDocument.pdf_filename && !selectedFile && (
              <Box p={4} bg="green.50" borderRadius="md" border="1px" borderColor="green.200">
                <HStack justify="space-between" align="start">
                  <HStack spacing={3}>
                    <Box fontSize="xl">📎</Box>
                    <VStack align="start" spacing={1}>
                      <Text fontSize="sm" fontWeight="semibold" color="green.700">
                        Trenutni prilog: {editingDocument.pdf_filename}
                      </Text>
                      <Text fontSize="xs" color="green.600">
                        Odaberite novi PDF da ga zamijenite
                      </Text>
                    </VStack>
                  </HStack>
                  <VStack spacing={2}>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      colorScheme="blue"
                      onClick={() => window.open(`http://localhost:5000/api/documents/${editingDocument.id}/download`, '_blank')}
                    >
                      Preuzmi
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      colorScheme="red" 
                      onClick={removeExistingAttachment}
                    >
                      Ukloni prilog
                    </Button>
                  </VStack>
                </HStack>
              </Box>
            )}
          </VStack>
        </FormControl>

        {loadingNumber && (
          <Alert status="info" borderRadius="md">
            <AlertIcon />
            Generiranje urudžbenog broja...
          </Alert>
        )}

        <HStack spacing={4} justify="end">
          <Button
            variant="outline"
            onClick={onCancel}
            leftIcon={<CloseIcon />}
          >
            Odustani
          </Button>
          <Button
            type="submit"
            colorScheme="blue"
            isLoading={submitting || loadingNumber}
            loadingText={submitting ? (isEditing ? 'Ažuriranje...' : 'Dodavanje...') : 'Generiranje...'}
            leftIcon={<CheckIcon />}
          >
            {isEditing ? 'Ažuriraj dopis' : 'Dodaj dopis'}
          </Button>
        </HStack>
      </VStack>

      {/* Modal za potvrdu promjene urudžbenog broja */}
      <Modal isOpen={isOpen} onClose={onClose} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            <HStack>
              <WarningIcon color="orange.500" />
              <Text>Potvrda promjene urudžbenog broja</Text>
            </HStack>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4} align="start">
              <Text>
                Namjeravate promijeniti urudžbeni broj postojećeg dopisa.
              </Text>
              <Text fontWeight="semibold">
                Trenutni broj: <Text as="span" color="blue.600">{originalRegistryNumber}</Text>
              </Text>
              <Text fontWeight="semibold">
                Novi broj: <Text as="span" color="orange.600">{pendingRegistryNumber}</Text>
              </Text>
              <Text fontSize="sm" color="gray.600">
                Promjena urudžbenog broja može utjecati na redoslijed evidencije i traceabilnost dokumenta. 
                Preporučuje se mijenjanje samo u slučaju greške pri unosu.
              </Text>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" mr={3} onClick={cancelRegistryNumberChange}>
              Odustani
            </Button>
            <Button 
              colorScheme="orange" 
              onClick={confirmRegistryNumberChange}
            >
              Potvrdi promjenu
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default DocumentForm;