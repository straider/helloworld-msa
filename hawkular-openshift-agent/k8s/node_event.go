/*
   Copyright 2016 Red Hat, Inc. and/or its affiliates
   and other contributors.

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
*/

package k8s

import ()

// Trigger indicates why the event was triggered
type Trigger string

const (
	POD_ADDED           Trigger = "POD_ADDED"
	POD_MODIFIED                = "POD_MODIFIED"
	POD_DELETED                 = "POD_DELETED"
	CONFIG_MAP_ADDED            = "CONFIG_MAP_ADDED"
	CONFIG_MAP_MODIFIED         = "CONFIG_MAP_MODIFIED"
	CONFIG_MAP_DELETED          = "CONFIG_MAP_DELETED"
)

// NodeEvent indicates when something changed with the node (either a pod or config map changed)
type NodeEvent struct {
	Trigger        Trigger
	Pod            *Pod
	ConfigMapEntry *ConfigMapEntry
}
