package com.macr120.mindhome;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;
import com.macr120.mindhome.widgets.WidgetsPlugin;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    // Los plugins locales se registran ANTES de super.onCreate (arranca el bridge).
    registerPlugin(WidgetsPlugin.class);
    super.onCreate(savedInstanceState);
  }
}
