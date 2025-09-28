import 'dart:convert';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:file_picker/file_picker.dart';
import 'package:firebase_core/firebase_core.dart'; // REQUIRED for Firebase
import 'package:cloud_functions/cloud_functions.dart'; // REQUIRED for Functions
import 'firebase_options.dart'; // REQUIRED for Firebase initialization
import 'package:flutter/foundation.dart';

// SADECE WEB İÇİN: flutter/foundation kütüphanesi ile kontrol edilerek import edilir
import 'dart:html' as html;

// Data structure expected by the Firebase Function
class ImageFile {
  final String base64;
  final String mimeType;

  ImageFile({required this.base64, required this.mimeType});

  Map<String, dynamic> toJson() => {
    'base64': base64,
    'mimeType': mimeType,
  };
}

// KRİTİK DÜZELTME: Renk sabitleri tanımlandı
const int _deepPurpleValue = 0xFF673AB7;
const Color _deepPurple = Color(_deepPurpleValue);

// KRİTİK DÜZELTME: MaterialColor Map'i sabit olarak tanımlandı
const Map<int, Color> _deepPurpleMap = {
  50: Color(0xFFEDE7F6),
  100: Color(0xFFD1C4E9),
  200: Color(0xFFB39DDB),
  300: Color(0xFF9575CD),
  400: Color(0xFF7E57C2),
  500: _deepPurple, // Main color
  600: Color(0xFF5E35B1),
  700: Color(0xFF512DA8),
  800: Color(0xFF4527A0),
  900: Color(0xFF311B92),
};

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp(
    options: DefaultFirebaseOptions.currentPlatform,
  );
  if (kDebugMode) {
    FirebaseFunctions.instance.useFunctionsEmulator('localhost', 5001);
  }

  runApp(MaterialApp(
    theme: ThemeData(
      primarySwatch: const MaterialColor(_deepPurpleValue, _deepPurpleMap),
      appBarTheme: const AppBarTheme(
        backgroundColor: _deepPurple,
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: const ButtonStyle(
          backgroundColor: MaterialStatePropertyAll<Color>(_deepPurple),
          foregroundColor: MaterialStatePropertyAll<Color>(Colors.white),
          padding: MaterialStatePropertyAll<EdgeInsets>(EdgeInsets.symmetric(vertical: 16)),
        ),
      ),
    ),
    home: const TryOnPage(),
  ));
}

class TryOnPage extends StatefulWidget {
  const TryOnPage({super.key});

  @override
  _TryOnPageState createState() => _TryOnPageState();
}

class _TryOnPageState extends State<TryOnPage> {
  Uint8List? _modelImageBytes;
  String _modelMimeType = 'image/jpeg';
  Uint8List? _clothingImageBytes;
  String _clothingMimeType = 'image/jpeg';

  Uint8List? resultImageBytes;
  bool _isLoading = false;
  String? _errorMessage;

  final FirebaseFunctions _functions = FirebaseFunctions.instance;

// --- YENİ WEB İNDİRME FONKSİYONU ---
  Future<void> _saveResultImage() async {
  if (resultImageBytes == null) {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('There is no result image to save.')),
    );
    return;
  }

  try {
    // Web'de, indirmeyi tetiklemek için bir Blob URL oluşturulur
    final blob = html.Blob([resultImageBytes]);
    final url = html.Url.createObjectUrlFromBlob(blob);

    // Bir bağlantı (<a> tag) oluşturulur ve tıklama simüle edilir
    final anchor = html.AnchorElement(href: url)
      ..setAttribute("download", "AI_TryOn_${DateTime.now().millisecondsSinceEpoch}.png")
      ..click();

    html.Url.revokeObjectUrl(url); // Belleği temizle

    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Image downloaded successfully!')),
    );

  } catch (e) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('An error occurred while saving the image: $e')),
    );
  }
}

  Future<void> _pickModelImage() async {
    try {
      final result = await FilePicker.platform.pickFiles(
        type: FileType.image,
        allowMultiple: false,
        withData: true,
      );

      if (result != null && result.files.isNotEmpty && result.files.first.bytes != null) {
        final extension = result.files.first.extension?.toLowerCase();
        final mimeType = extension == 'png' ? 'image/png' : 'image/jpeg';

        setState(() {
          _modelImageBytes = result.files.first.bytes;
          _modelMimeType = mimeType;
          _errorMessage = null;
          resultImageBytes = null;
        });
      }
    } catch (e) {
      setState(() {
        _errorMessage = 'Model image could not be selected: $e';
      });
    }
  }

  Future<void> _pickClothingImage() async {
    try {
      final result = await FilePicker.platform.pickFiles(
        type: FileType.image,
        allowMultiple: false,
        withData: true,
      );

      if (result != null && result.files.isNotEmpty && result.files.first.bytes != null) {
        final extension = result.files.first.extension?.toLowerCase();
        final mimeType = extension == 'png' ? 'image/png' : 'image/jpeg';

        setState(() {
          _clothingImageBytes = result.files.first.bytes;
          _clothingMimeType = mimeType;
          _errorMessage = null;
          resultImageBytes = null;
        });
      }
    } catch (e) {
      setState(() {
        _errorMessage = 'Clothing image could not be selected: $e';
      });
    }
  }

  Future<void> _callSwapFunction() async {
    if (_modelImageBytes == null || _clothingImageBytes == null) {
      setState(() {
        _errorMessage = 'Please select both model and clothing images.';
      });
      return;
    }

    setState(() {
      _isLoading = true;
      resultImageBytes = null;
      _errorMessage = null;
    });

    try {
      final personBase64 = base64Encode(_modelImageBytes!);
      final clothingBase64 = base64Encode(_clothingImageBytes!);

      final dataToSend = {
        'personImage': ImageFile(
          base64: personBase64,
          mimeType: _modelMimeType,
        ).toJson(),
        'clothingImage': ImageFile(
          base64: clothingBase64,
          mimeType: _clothingMimeType,
        ).toJson(),
      };

      final HttpsCallable callable = _functions.httpsCallable('swapClothes');
      final result = await callable.call(dataToSend);

      final responseData = result.data as Map<String, dynamic>;
      final imageUrl = responseData['imageUrl'] as String?;
      final textMessage = responseData['text'] as String?;

      if (imageUrl != null && imageUrl.isNotEmpty) {
        final base64Parts = imageUrl.split(',');
        final rawBase64 = base64Parts.length > 1 ? base64Parts[1] : base64Parts[0];

        setState(() {
          resultImageBytes = base64Decode(rawBase64);
        });
      } else {
        final errorText = textMessage ?? 'AI did not return a valid swapped image. Please check Firebase Functions logs.';
        throw Exception(errorText);
      }

    } on FirebaseFunctionsException catch (e) {
      debugPrint('Firebase Function Error: ${e.code} - ${e.message}');
      setState(() {
        _errorMessage = 'Function Error (${e.code}): ${e.message}';
      });
    } catch (e) {
      debugPrint("General Error: $e");
      setState(() {
        _errorMessage = 'An unexpected error occurred: $e';
      });
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text("AI Clothes Swap"),
      ),

      // DÜZELTME: body widget'ını SingleChildScrollView ile sarmalıyoruz
      body: SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Error message display
              if (_errorMessage != null)
                Container(
                  padding: const EdgeInsets.all(12),
                  color: Colors.red[100],
                  child: Text(
                    _errorMessage!,
                    style: TextStyle(color: Colors.red[800]),
                  ),
                ),

              const SizedBox(height: 20),

              // Image Selection
              Row(
                children: [
                  Expanded(
                    child: Column(
                      children: [
                        if (_modelImageBytes != null)
                          Container(
                            height: 120,
                            decoration: BoxDecoration(
                              border: Border.all(color: _deepPurple),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Image.memory(_modelImageBytes!, fit: BoxFit.cover),
                          ),
                        const SizedBox(height: 10),
                        ElevatedButton(
                          onPressed: _isLoading ? null : _pickModelImage,
                          child: const Text('Select Model Image'),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      children: [
                        if (_clothingImageBytes != null)
                          Container(
                            height: 120,
                            decoration: BoxDecoration(
                              border: Border.all(color: _deepPurple),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Image.memory(_clothingImageBytes!, fit: BoxFit.cover),
                          ),
                        const SizedBox(height: 10),
                        ElevatedButton(
                          onPressed: _isLoading ? null : _pickClothingImage,
                          child: const Text('Select Clothing Image'),
                        ),
                      ],
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 30),

              // Try On Button
              ElevatedButton(
                onPressed: _isLoading ? null : _callSwapFunction,
                child: _isLoading
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                        ),
                      )
                    : const Text(
                        'Perform Virtual Try-On',
                        style: TextStyle(fontSize: 18, color: Colors.white),
                      ),
              ),

              if (_isLoading)
                const Padding(
                  padding: EdgeInsets.only(top: 8.0),
                  child: Center(
                    child: Text('AI Processing...'),
                  ),
                ),

              const SizedBox(height: 20),

              // Result Display
              if (resultImageBytes != null)
                Center(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.center,
                    children: [
                      const Text(
                        'Result:',
                        style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 10),
                      Container(
                        constraints: BoxConstraints(
                          maxHeight: MediaQuery.of(context).size.height * 0.4,
                          maxWidth: 400,
                        ),
                        decoration: BoxDecoration(
                          border: Border.all(color: Colors.grey),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Image.memory(resultImageBytes!, fit: BoxFit.contain),
                      ),

                      const SizedBox(height: 10),
                      // İndirme Butonu
                      ElevatedButton.icon(
                        onPressed: _saveResultImage,
                        icon: const Icon(Icons.download, color: Colors.white),
                        label: const Text(
                          'Download Result',
                          style: TextStyle(color: Colors.white),
                        ),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: _deepPurple,
                        ),
                      ),
                      // Alt boşluk eklenir, böylece en alttaki buton da kaydırma alanına girer.
                      const SizedBox(height: 30),
                    ],
                  ),
                ),

              // Kaldırılan Expanded widget'ı yerine herhangi bir şey eklenmedi.

            ],
          ),
        ),
      ),
    );
  }
}