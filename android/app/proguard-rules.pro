# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# If your project uses WebView with JS, uncomment the following
# and specify the fully qualified class name to the JavaScript interface
# class:
#-keepclassmembers class fqcn.of.javascript.interface.for.webview {
#   public *;
#}

# Conserva los números de línea para que los stack traces de Play Console
# (Crashes y ANR) apunten a la línea real tras desofuscar con el mapping.
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile
